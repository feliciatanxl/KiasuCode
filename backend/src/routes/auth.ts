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

type AuthProvider = 'google' | 'telegram'

interface UserRow extends RowDataPacket {
  id: string
  provider: AuthProvider
  provider_id: string
  email: string | null
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
    const sessionToken = jwt.sign(
      { sub: user.id },
      requireEnvironmentVariable('JWT_SECRET'),
      {
        algorithm: 'HS256',
        expiresIn: '7d',
        issuer: 'kiasucode',
        audience: 'kiasucode-frontend',
      },
    )

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
