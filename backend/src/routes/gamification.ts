import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'

interface PetRow extends RowDataPacket {
  id: string
  user_id: string
  name: string
  hunger_level: number
  happiness_level: number
  last_interacted_at: Date | string
}

interface WalletRow extends RowDataPacket {
  coins_balance: number | string
}

interface StudySessionRow extends RowDataPacket {
  id: string
  module_id: string
  duration_minutes: number
  created_at: Date | string
}

interface PetResponse {
  id: string
  name: string
  hungerLevel: number
  happinessLevel: number
  lastInteractedAt: string
}

const router = Router()
const dayMs = 24 * 60 * 60 * 1000
const hungerDecayPerDay = 10
const foodCost = 20
const foodHungerIncrease = 25
const foodHappinessIncrease = 10
const gamificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many gamification requests. Please try again later.' },
})

class InvalidGamificationRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Database returned an invalid timestamp.')
  }

  return date.toISOString()
}

function serializePet(row: PetRow): PetResponse {
  return {
    id: row.id,
    name: row.name,
    hungerLevel: Number(row.hunger_level),
    happinessLevel: Number(row.happiness_level),
    lastInteractedAt: toIsoString(row.last_interacted_at),
  }
}

async function ensureGamificationRows(
  connection: PoolConnection,
  userId: string,
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO user_wallets (user_id, coins_balance)
     VALUES (?, 0)
     ON DUPLICATE KEY UPDATE coins_balance = coins_balance`,
    [userId],
  )
  await connection.execute<ResultSetHeader>(
    `INSERT INTO pets
      (id, user_id, name, hunger_level, happiness_level, last_interacted_at)
     VALUES (?, ?, 'Byte', 100, 100, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE id = id`,
    [uuidv4(), userId],
  )
}

async function applyPetDecay(
  connection: PoolConnection,
  pet: PetRow,
): Promise<PetRow> {
  const lastInteractedAt = new Date(pet.last_interacted_at)

  if (Number.isNaN(lastInteractedAt.getTime())) {
    throw new Error('Database returned an invalid pet interaction timestamp.')
  }

  const elapsedDays = Math.floor(
    Math.max(0, Date.now() - lastInteractedAt.getTime()) / dayMs,
  )

  if (elapsedDays === 0) return pet

  const hungerLevel = Math.max(
    0,
    Number(pet.hunger_level) - elapsedDays * hungerDecayPerDay,
  )
  const decayCheckpoint = new Date(
    lastInteractedAt.getTime() + elapsedDays * dayMs,
  )

  await connection.execute<ResultSetHeader>(
    `UPDATE pets
        SET hunger_level = ?, last_interacted_at = ?
      WHERE id = ? AND user_id = ?`,
    [hungerLevel, decayCheckpoint, pet.id, pet.user_id],
  )

  return {
    ...pet,
    hunger_level: hungerLevel,
    last_interacted_at: decayCheckpoint,
  }
}

async function getLockedPet(
  connection: PoolConnection,
  userId: string,
): Promise<PetRow> {
  const [rows] = await connection.execute<PetRow[]>(
    `SELECT id, user_id, name, hunger_level, happiness_level,
            last_interacted_at
       FROM pets
      WHERE user_id = ?
      FOR UPDATE`,
    [userId],
  )
  const pet = rows[0]

  if (!pet) throw new Error('Unable to initialize pet.')

  return applyPetDecay(connection, pet)
}

async function getWalletBalance(
  connection: PoolConnection,
  userId: string,
): Promise<number> {
  const [rows] = await connection.execute<WalletRow[]>(
    `SELECT coins_balance
       FROM user_wallets
      WHERE user_id = ?`,
    [userId],
  )

  return Number(rows[0]?.coins_balance ?? 0)
}

router.post(
  '/study/session',
  authenticateRequest,
  gamificationRateLimiter,
  async (request: Request, response: Response) => {
    let connection: PoolConnection | undefined

    try {
      if (!isRecord(request.body)) {
        throw new InvalidGamificationRequestError('A JSON request body is required.')
      }

      const moduleIdValue = request.body.module_id ?? request.body.moduleId
      const moduleId = typeof moduleIdValue === 'string'
        ? moduleIdValue.trim()
        : ''
      const durationValue = request.body.duration_minutes
        ?? request.body.durationMinutes
      const durationMinutes = Number(durationValue)

      if (!moduleId) {
        throw new InvalidGamificationRequestError('Module ID is required.')
      }

      if (
        !Number.isInteger(durationMinutes)
        || durationMinutes < 1
        || durationMinutes > 480
      ) {
        throw new InvalidGamificationRequestError(
          'Duration must be a whole number between 1 and 480 minutes.',
        )
      }

      const userId = getUserId(response)
      const coinsEarned = durationMinutes
      const sessionId = uuidv4()
      connection = await db.getConnection()
      await connection.beginTransaction()

      const [moduleRows] = await connection.execute<RowDataPacket[]>(
        `SELECT m.id
           FROM modules AS m
           INNER JOIN semesters AS s ON s.id = m.semester_id
           INNER JOIN institutions AS i ON i.id = s.institution_id
          WHERE m.id = ? AND i.user_id = ?
          FOR UPDATE`,
        [moduleId, userId],
      )

      if (!moduleRows[0]) {
        await connection.rollback()
        response.status(404).json({ error: 'Module not found.' })
        return
      }

      await connection.execute<ResultSetHeader>(
        `INSERT INTO study_sessions
          (id, user_id, module_id, duration_minutes)
         VALUES (?, ?, ?, ?)`,
        [sessionId, userId, moduleId, durationMinutes],
      )
      await connection.execute<ResultSetHeader>(
        `INSERT INTO user_wallets (user_id, coins_balance)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE coins_balance = coins_balance + ?`,
        [userId, coinsEarned, coinsEarned],
      )

      const [sessionRows] = await connection.execute<StudySessionRow[]>(
        `SELECT id, module_id, duration_minutes, created_at
           FROM study_sessions
          WHERE id = ? AND user_id = ?`,
        [sessionId, userId],
      )
      const studySession = sessionRows[0]
      const coinsBalance = await getWalletBalance(connection, userId)

      if (!studySession) throw new Error('Unable to load the recorded study session.')

      await connection.commit()
      response.status(201).json({
        session: {
          id: studySession.id,
          moduleId: studySession.module_id,
          durationMinutes: Number(studySession.duration_minutes),
          coinsEarned,
          createdAt: toIsoString(studySession.created_at),
        },
        wallet: { coinsBalance },
      })
    } catch (error) {
      if (connection) await connection.rollback().catch(() => undefined)

      if (error instanceof InvalidGamificationRequestError) {
        response.status(400).json({ error: error.message })
        return
      }

      console.error('Unable to record study session: %o', error)
      response.status(500).json({ error: 'Unable to record study session.' })
    } finally {
      connection?.release()
    }
  },
)

router.get(
  '/pet',
  authenticateRequest,
  gamificationRateLimiter,
  async (_request: Request, response: Response) => {
    let connection: PoolConnection | undefined

    try {
      const userId = getUserId(response)
      connection = await db.getConnection()
      await connection.beginTransaction()
      await ensureGamificationRows(connection, userId)

      const pet = await getLockedPet(connection, userId)
      const coinsBalance = await getWalletBalance(connection, userId)

      await connection.commit()
      response.status(200).json({
        pet: serializePet(pet),
        wallet: { coinsBalance },
      })
    } catch (error) {
      if (connection) await connection.rollback().catch(() => undefined)
      console.error('Unable to load pet status: %o', error)
      response.status(500).json({ error: 'Unable to load pet status.' })
    } finally {
      connection?.release()
    }
  },
)

router.post(
  '/pet/buy-food',
  authenticateRequest,
  gamificationRateLimiter,
  async (_request: Request, response: Response) => {
    let connection: PoolConnection | undefined

    try {
      const userId = getUserId(response)
      connection = await db.getConnection()
      await connection.beginTransaction()
      await ensureGamificationRows(connection, userId)

      const pet = await getLockedPet(connection, userId)
      const [walletRows] = await connection.execute<WalletRow[]>(
        `SELECT coins_balance
           FROM user_wallets
          WHERE user_id = ?
          FOR UPDATE`,
        [userId],
      )
      const coinsBalance = Number(walletRows[0]?.coins_balance ?? 0)

      if (coinsBalance < foodCost) {
        await connection.rollback()
        response.status(409).json({
          error: `You need ${foodCost} coins to buy food.`,
          wallet: { coinsBalance },
        })
        return
      }

      const hungerLevel = Math.min(
        100,
        Number(pet.hunger_level) + foodHungerIncrease,
      )
      const happinessLevel = Math.min(
        100,
        Number(pet.happiness_level) + foodHappinessIncrease,
      )

      await connection.execute<ResultSetHeader>(
        `UPDATE user_wallets
            SET coins_balance = coins_balance - ?
          WHERE user_id = ?`,
        [foodCost, userId],
      )
      await connection.execute<ResultSetHeader>(
        `UPDATE pets
            SET hunger_level = ?, happiness_level = ?,
                last_interacted_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?`,
        [hungerLevel, happinessLevel, pet.id, userId],
      )

      const [updatedPetRows] = await connection.execute<PetRow[]>(
        `SELECT id, user_id, name, hunger_level, happiness_level,
                last_interacted_at
           FROM pets
          WHERE id = ? AND user_id = ?`,
        [pet.id, userId],
      )
      const updatedPet = updatedPetRows[0]

      if (!updatedPet) throw new Error('Unable to load updated pet.')

      await connection.commit()
      response.status(200).json({
        pet: serializePet(updatedPet),
        wallet: { coinsBalance: coinsBalance - foodCost },
        purchase: { cost: foodCost },
      })
    } catch (error) {
      if (connection) await connection.rollback().catch(() => undefined)
      console.error('Unable to buy pet food: %o', error)
      response.status(500).json({ error: 'Unable to buy pet food.' })
    } finally {
      connection?.release()
    }
  },
)

export default router
