import bcrypt from 'bcryptjs'
import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import {
  AuthVerificationError,
  verifyGoogleToken,
  verifyTelegramAuth,
} from '../utils/auth.js'

type AuthProvider = 'google' | 'telegram' | 'local'

interface UserRow extends RowDataPacket {
  id: string
  provider: AuthProvider
  provider_id: string
  email: string | null
  password_hash?: string | null
  name: string
  photo_url: string | null
}

interface AuthUser {
  id: string
  provider: AuthProvider
  name: string
  email?: string
  photoUrl?: string
}

interface VerifiedIdentity {
  provider: AuthProvider
  providerId: string
  email: string | null
  name: string
  photoUrl: string | null
}

class InvalidAuthRequestError extends Error {}

const router = Router()

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function generateSessionToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    requireEnvironmentVariable('JWT_SECRET'),
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'kiasucode',
      audience: 'kiasucode-frontend',
    },
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getGoogleCredential(payload: unknown): string {
  if (typeof payload === 'string') return payload

  if (isRecord(payload) && typeof payload.credential === 'string') {
    return payload.credential
  }

  throw new InvalidAuthRequestError('Google credential is required.')
}

async function verifyIdentity(
  provider: AuthProvider,
  payload: unknown,
): Promise<VerifiedIdentity> {
  if (provider === 'google') {
    const googleUser = await verifyGoogleToken(getGoogleCredential(payload))

    return {
      provider,
      providerId: googleUser.providerId,
      email: googleUser.email ?? null,
      name: googleUser.name,
      photoUrl: googleUser.picture ?? null,
    }
  }

  const telegramUser = verifyTelegramAuth(payload)
  const name = [telegramUser.firstName, telegramUser.lastName]
    .filter(Boolean)
    .join(' ') || telegramUser.username || 'Telegram user'

  return {
    provider,
    providerId: telegramUser.providerId,
    email: null,
    name,
    photoUrl: telegramUser.photoUrl ?? null,
  }
}

function serializeUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    ...(row.email ? { email: row.email } : {}),
    ...(row.photo_url ? { photoUrl: row.photo_url } : {}),
  }
}

router.post('/register', async (request: Request, response: Response) => {
  try {
    const body: unknown = request.body

    if (!isRecord(body)) {
      throw new InvalidAuthRequestError('A JSON request body is required.')
    }

    const { name, email, password } = body

    if (typeof name !== 'string' || !name.trim()) {
      throw new InvalidAuthRequestError('A valid full name is required.')
    }

    if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      throw new InvalidAuthRequestError('A valid email address is required.')
    }

    if (typeof password !== 'string' || password.length < 6) {
      throw new InvalidAuthRequestError('Password must be at least 6 characters long.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    // Check if user already exists with this email
    const [existingRows] = await db.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    )

    if (existingRows.length > 0) {
      response.status(409).json({ error: 'An account with this email address already exists.' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    const providerId = `local:${normalizedEmail}`

    await db.execute<ResultSetHeader>(
      `INSERT INTO users
        (id, provider, provider_id, email, password_hash, name, photo_url)
       VALUES (?, 'local', ?, ?, ?, ?, NULL)`,
      [id, providerId, normalizedEmail, passwordHash, trimmedName],
    )

    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    )
    const userRow = rows[0]

    if (!userRow) {
      throw new Error('Unable to create the user account.')
    }

    const user = serializeUser(userRow)
    const sessionToken = generateSessionToken(user.id)

    response.status(201).json({ user, sessionToken })
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to register user.', error)
    response.status(500).json({ error: 'Unable to register user account.' })
  }
})

router.post('/login', async (request: Request, response: Response) => {
  try {
    const body: unknown = request.body

    if (!isRecord(body)) {
      throw new InvalidAuthRequestError('A JSON request body is required.')
    }

    const { email, password } = body

    if (typeof email !== 'string' || !email.trim()) {
      throw new InvalidAuthRequestError('Email address is required.')
    }

    if (typeof password !== 'string' || !password) {
      throw new InvalidAuthRequestError('Password is required.')
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    )
    const userRow = rows[0]

    if (!userRow || !userRow.password_hash) {
      response.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash)

    if (!isMatch) {
      response.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const user = serializeUser(userRow)
    const sessionToken = generateSessionToken(user.id)

    response.status(200).json({ user, sessionToken })
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to sign in user.', error)
    response.status(500).json({ error: 'Unable to sign in.' })
  }
})

router.post('/session', async (request: Request, response: Response) => {
  try {
    const body: unknown = request.body

    if (!isRecord(body)) {
      throw new InvalidAuthRequestError('A JSON request body is required.')
    }

    const provider = body.provider

    if (provider !== 'google' && provider !== 'telegram') {
      throw new InvalidAuthRequestError('Unsupported authentication provider.')
    }

    // `payload` is the canonical API field. The fallbacks keep the current
    // frontend request format working while clients migrate to the new shape.
    const payload = body.payload ?? (
      provider === 'google' ? body.credential : body.authData
    )

    if (payload === undefined || payload === null) {
      throw new InvalidAuthRequestError('Authentication payload is required.')
    }

    const identity = await verifyIdentity(provider, payload)
    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE provider_id = ? LIMIT 1',
      [identity.providerId],
    )
    let userRow = rows[0]

    if (!userRow) {
      const id = uuidv4()

      await db.execute<ResultSetHeader>(
        `INSERT INTO users
          (id, provider, provider_id, email, name, photo_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          identity.provider,
          identity.providerId,
          identity.email,
          identity.name,
          identity.photoUrl,
        ],
      )

      const [createdRows] = await db.execute<UserRow[]>(
        'SELECT * FROM users WHERE provider_id = ? LIMIT 1',
        [identity.providerId],
      )
      userRow = createdRows[0]
    }

    if (!userRow) {
      throw new Error('Unable to load the authenticated user.')
    }

    if (userRow.provider !== identity.provider) {
      throw new Error('Provider ID collision detected.')
    }

    const user = serializeUser(userRow)
    const sessionToken = generateSessionToken(user.id)

    response.status(200).json({ user, sessionToken })
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    if (error instanceof AuthVerificationError) {
      response.status(401).json({ error: error.message })
      return
    }

    console.error('Unable to create authentication session.', error)
    response.status(500).json({ error: 'Unable to create authentication session.' })
  }
})

export default router
