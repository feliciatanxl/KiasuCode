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
  first_name?: string | null
  pet_type?: string | null
  hunger_level: number
  happiness_level: number
  last_interacted_at: Date | string
}

interface WalletRow extends RowDataPacket {
  coins_balance: number | string
}

interface StudySessionRow extends RowDataPacket {
  id: string
  module_id: string | null
  custom_category: string | null
  duration_minutes: number
  created_at: Date | string
}

interface HeatmapRow extends RowDataPacket {
  activity_date: string
  total_minutes: number | string
}

interface PetResponse {
  id: string
  name: string
  firstName: string
  petType: string
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
    firstName: row.first_name || row.name || 'Byte',
    petType: row.pet_type || 'hatchling',
    hungerLevel: Number(row.hunger_level),
    happinessLevel: Number(row.happiness_level),
    lastInteractedAt: toIsoString(row.last_interacted_at),
  }
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function ensureWalletRow(
  connection: PoolConnection,
  userId: string,
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO user_wallets (user_id, coins_balance)
     VALUES (?, 0)
     ON DUPLICATE KEY UPDATE coins_balance = coins_balance`,
    [userId],
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
): Promise<PetRow | null> {
  const [rows] = await connection.execute<PetRow[]>(
    `SELECT id, user_id, name, first_name, pet_type, hunger_level, happiness_level,
            last_interacted_at
       FROM pets
      WHERE user_id = ?
      FOR UPDATE`,
    [userId],
  )
  const pet = rows[0]

  if (!pet) return null

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

router.get(
  '/study_sessions/heatmap',
  authenticateRequest,
  gamificationRateLimiter,
  async (_request: Request, response: Response) => {
    try {
      const [rows] = await db.execute<HeatmapRow[]>(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS activity_date,
                SUM(duration_minutes) AS total_minutes
           FROM study_sessions
          WHERE user_id = ?
            AND created_at >= UTC_DATE() - INTERVAL 29 DAY
            AND created_at < UTC_DATE() + INTERVAL 1 DAY
          GROUP BY activity_date
          ORDER BY activity_date ASC`,
        [getUserId(response)],
      )
      const minutesByDate = new Map(
        rows.map((row) => [row.activity_date, Number(row.total_minutes)]),
      )
      const today = new Date()
      const activity = Array.from({ length: 30 }, (_, index) => {
        const offsetDays = index - 29
        const date = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + offsetDays,
        ))
        const dateKey = formatUtcDate(date)

        return {
          date: dateKey,
          minutes: minutesByDate.get(dateKey) ?? 0,
        }
      })

      response.status(200).json({ activity })
    } catch (error) {
      console.error('Unable to load study activity heatmap: %o', error)
      response.status(500).json({ error: 'Unable to load study activity.' })
    }
  },
)

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
      const customCategoryValue = request.body.custom_category
        ?? request.body.customCategory
      const customCategory = typeof customCategoryValue === 'string'
        ? customCategoryValue.trim()
        : ''
      const durationValue = request.body.duration_minutes
        ?? request.body.durationMinutes
      const durationMinutes = Number(durationValue)

      if ((!moduleId && !customCategory) || (moduleId && customCategory)) {
        throw new InvalidGamificationRequestError(
          'Choose either a module or a custom category for the study session.',
        )
      }

      if (customCategory.length > 255) {
        throw new InvalidGamificationRequestError(
          'Custom categories must be 255 characters or fewer.',
        )
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

      if (moduleId) {
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
      }

      await connection.execute<ResultSetHeader>(
        `INSERT INTO study_sessions
          (id, user_id, module_id, custom_category, duration_minutes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          moduleId || null,
          customCategory || null,
          durationMinutes,
        ],
      )
      await connection.execute<ResultSetHeader>(
        `INSERT INTO user_wallets (user_id, coins_balance)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE coins_balance = coins_balance + ?`,
        [userId, coinsEarned, coinsEarned],
      )

      const [sessionRows] = await connection.execute<StudySessionRow[]>(
        `SELECT id, module_id, custom_category, duration_minutes, created_at
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
          customCategory: studySession.custom_category,
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
      await ensureWalletRow(connection, userId)

      let pet = await getLockedPet(connection, userId)
      const coinsBalance = await getWalletBalance(connection, userId)

      if (!pet) {
        // Auto-initialize default pet if user has none
        const petId = uuidv4()
        await connection.execute<ResultSetHeader>(
          `INSERT INTO pets
            (id, user_id, name, first_name, pet_type, hunger_level, happiness_level, last_interacted_at)
           VALUES (?, ?, 'Byte', 'Byte', 'hatchling', 100, 100, CURRENT_TIMESTAMP)`,
          [petId, userId],
        )
        const [createdRows] = await connection.execute<PetRow[]>(
          `SELECT id, user_id, name, first_name, pet_type, hunger_level, happiness_level, last_interacted_at
             FROM pets WHERE id = ?`,
          [petId],
        )
        pet = createdRows[0] ?? null
      }

      await connection.commit()
      response.status(200).json({
        pet: pet ? serializePet(pet) : null,
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

// POST or PUT /pet - Create or update pet (Immutable first_name)
const handleSavePet = async (request: Request, response: Response) => {
  let connection: PoolConnection | undefined

  try {
    if (!isRecord(request.body)) {
      throw new InvalidGamificationRequestError('A JSON request body is required.')
    }

    const userId = getUserId(response)
    const rawFirstName = request.body.first_name ?? request.body.firstName
    const rawNickname = request.body.name ?? request.body.nickname
    const rawPetType = request.body.pet_type ?? request.body.petType

    const firstNameInput = typeof rawFirstName === 'string' ? rawFirstName.trim() : ''
    const nicknameInput = typeof rawNickname === 'string' ? rawNickname.trim() : ''
    const petTypeInput = typeof rawPetType === 'string' ? rawPetType.trim() : 'hatchling'

    connection = await db.getConnection()
    await connection.beginTransaction()
    await ensureWalletRow(connection, userId)

    const existingPet = await getLockedPet(connection, userId)

    if (!existingPet) {
      // Create new pet: First name is required and permanently locked
      if (!firstNameInput) {
        throw new InvalidGamificationRequestError('A permanent first name is required to adopt a pet.')
      }

      const finalName = nicknameInput || firstNameInput
      const petId = uuidv4()

      await connection.execute<ResultSetHeader>(
        `INSERT INTO pets
          (id, user_id, name, first_name, pet_type, hunger_level, happiness_level, last_interacted_at)
         VALUES (?, ?, ?, ?, ?, 100, 100, CURRENT_TIMESTAMP)`,
        [petId, userId, finalName, firstNameInput, petTypeInput],
      )

      const [createdRows] = await connection.execute<PetRow[]>(
        `SELECT id, user_id, name, first_name, pet_type, hunger_level, happiness_level, last_interacted_at
           FROM pets WHERE id = ?`,
        [petId],
      )
      const newPet = createdRows[0]
      if (!newPet) throw new Error('Unable to create pet.')

      const coinsBalance = await getWalletBalance(connection, userId)

      await connection.commit()
      response.status(201).json({
        pet: serializePet(newPet),
        wallet: { coinsBalance },
      })
      return
    }

    // Existing pet update: first_name is IMMUTABLE!
    // If the database row does not have first_name yet (legacy row), allow setting it once.
    let permanentFirstName = existingPet.first_name
    if (!permanentFirstName && firstNameInput) {
      permanentFirstName = firstNameInput
    } else if (!permanentFirstName) {
      permanentFirstName = existingPet.name
    }

    const nextNickname = nicknameInput || existingPet.name
    const nextPetType = petTypeInput || existingPet.pet_type || 'hatchling'

    await connection.execute<ResultSetHeader>(
      `UPDATE pets
          SET name = ?, first_name = ?, pet_type = ?
        WHERE id = ? AND user_id = ?`,
      [nextNickname, permanentFirstName, nextPetType, existingPet.id, userId],
    )

    const [updatedRows] = await connection.execute<PetRow[]>(
      `SELECT id, user_id, name, first_name, pet_type, hunger_level, happiness_level, last_interacted_at
         FROM pets WHERE id = ?`,
      [existingPet.id],
    )
    const updatedPet = updatedRows[0]
    if (!updatedPet) throw new Error('Unable to load updated pet.')

    const coinsBalance = await getWalletBalance(connection, userId)

    await connection.commit()
    response.status(200).json({
      pet: serializePet(updatedPet),
      wallet: { coinsBalance },
    })
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined)
    if (error instanceof InvalidGamificationRequestError) {
      response.status(400).json({ error: error.message })
      return
    }
    console.error('Unable to save pet: %o', error)
    response.status(500).json({ error: 'Unable to save pet details.' })
  } finally {
    connection?.release()
  }
}

router.post('/pet', authenticateRequest, gamificationRateLimiter, handleSavePet)
router.put('/pet', authenticateRequest, gamificationRateLimiter, handleSavePet)

// DELETE /pet and POST /pet/reset - Reset/release pet back to level 0
const handleResetPet = async (_request: Request, response: Response) => {
  let connection: PoolConnection | undefined

  try {
    const userId = getUserId(response)
    connection = await db.getConnection()
    await connection.beginTransaction()

    await connection.execute<ResultSetHeader>(
      'DELETE FROM pets WHERE user_id = ?',
      [userId],
    )

    const coinsBalance = await getWalletBalance(connection, userId)
    await connection.commit()

    response.status(200).json({
      success: true,
      message: 'Pet released and progress reset to 0.',
      wallet: { coinsBalance },
    })
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined)
    console.error('Unable to reset pet: %o', error)
    response.status(500).json({ error: 'Unable to reset pet.' })
  } finally {
    connection?.release()
  }
}

router.delete('/pet', authenticateRequest, gamificationRateLimiter, handleResetPet)
router.post('/pet/reset', authenticateRequest, gamificationRateLimiter, handleResetPet)

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
      await ensureWalletRow(connection, userId)

      const pet = await getLockedPet(connection, userId)
      if (!pet) {
        await connection.rollback()
        response.status(404).json({ error: 'No active pet found to feed.' })
        return
      }

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
        `SELECT id, user_id, name, first_name, pet_type, hunger_level, happiness_level,
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
