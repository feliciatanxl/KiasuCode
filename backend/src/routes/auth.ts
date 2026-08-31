import bcrypt from 'bcrypt'
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  AuthVerificationError,
  verifyGoogleToken,
} from '../utils/auth.js'
import { clearSessionCookie, setSessionCookie } from '../utils/session.js'
import {
  requireTelegramClientId,
  verifyTelegramAuth,
  verifyTelegramIdToken,
  type VerifiedTelegramUser,
} from '../utils/telegramAuth.js'

type AuthProvider = 'google' | 'telegram' | 'local'

interface UserRow extends RowDataPacket {
  id: string
  provider: AuthProvider
  provider_id: string
  email: string | null
  password_hash?: string | null
  name: string
  photo_url: string | null
  session_version?: number
}

interface PasswordHistoryRow extends RowDataPacket {
  password_hash: string
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
const passwordReuseError = 'For security reasons, you cannot reuse your last 3 passwords.'
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
})

router.use(authRateLimiter)

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function generateSessionToken(userId: string, sessionVersion: number = 1): string {
  return jwt.sign(
    { sub: userId, session_version: sessionVersion },
    requireEnvironmentVariable('JWT_SECRET'),
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'kiasucode',
      audience: 'kiasucode-frontend',
    },
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getGoogleCredential(payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()

  if (isRecord(payload)) {
    if (typeof payload.access_token === 'string' && payload.access_token.trim()) {
      return payload.access_token.trim()
    }
    if (typeof payload.credential === 'string' && payload.credential.trim()) {
      return payload.credential.trim()
    }
    if (typeof payload.token === 'string' && payload.token.trim()) {
      return payload.token.trim()
    }
    if (typeof payload.payload === 'string' && payload.payload.trim()) {
      return payload.payload.trim()
    }
  }

  throw new InvalidAuthRequestError('Google access token is required.')
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

  const telegramUser = typeof payload === 'string'
    ? await verifyTelegramIdToken(payload)
    : verifyTelegramAuth(payload)
  const name = [telegramUser.firstName, telegramUser.lastName]
    .filter(Boolean)
    .join(' ') || telegramUser.username || 'Telegram user'

  return {
    provider,
    providerId: `telegram:${telegramUser.providerId}`,
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

function sendAuthenticatedUser(
  request: Request,
  response: Response,
  status: number,
  user: AuthUser,
  sessionVersion: number = 1,
): void {
  setSessionCookie(request, response, generateSessionToken(user.id, sessionVersion))
  response.set('Cache-Control', 'no-store')
  response.status(status).json({ user })
}

async function hasRecentlyUsedPassword(
  connection: PoolConnection,
  userId: string,
  password: string,
): Promise<boolean> {
  const [rows] = await connection.execute<PasswordHistoryRow[]>(
    `SELECT password_hash
       FROM password_history
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 3`,
    [userId],
  )

  const matches = await Promise.all(
    rows.map((row) => bcrypt.compare(password, row.password_hash)),
  )

  return matches.some(Boolean)
}

async function upsertTelegramUser(
  telegramUser: VerifiedTelegramUser,
): Promise<UserRow> {
  const canonicalProviderId = `telegram:${telegramUser.providerId}`
  const name = (
    [telegramUser.firstName, telegramUser.lastName]
      .filter(Boolean)
      .join(' ')
    || telegramUser.username
    || 'Telegram user'
  ).slice(0, 160)
  const photoUrl = telegramUser.photoUrl ?? null
  const [existingRows] = await db.execute<UserRow[]>(
    `SELECT *
       FROM users
      WHERE provider = 'telegram'
        AND provider_id IN (?, ?)
      LIMIT 1`,
    [canonicalProviderId, telegramUser.providerId],
  )
  const existingUser = existingRows[0]

  if (existingUser) {
    await db.execute<ResultSetHeader>(
      `UPDATE users
          SET name = ?, photo_url = ?, session_version = session_version + 1
        WHERE id = ?`,
      [name, photoUrl, existingUser.id],
    )
  } else {
    await db.execute<ResultSetHeader>(
      `INSERT INTO users
        (id, provider, provider_id, email, password_hash, name, photo_url, session_version)
       VALUES (?, 'telegram', ?, NULL, NULL, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = ?, photo_url = ?, session_version = session_version + 1`,
      [
        uuidv4(),
        canonicalProviderId,
        name,
        photoUrl,
        name,
        photoUrl,
      ],
    )
  }

  const [rows] = await db.execute<UserRow[]>(
    `SELECT *
       FROM users
      WHERE provider = 'telegram'
        AND provider_id IN (?, ?)
      LIMIT 1`,
    [canonicalProviderId, telegramUser.providerId],
  )
  const user = rows[0]

  if (!user) throw new Error('Unable to load Telegram user after authentication.')

  return user
}

router.post('/register', async (request: Request, response: Response) => {
  try {
    const body: unknown = request.body

    if (!isRecord(body)) {
      throw new InvalidAuthRequestError('A JSON request body is required.')
    }

    const { name, username, email, password } = body
    const rawUsername = username ?? name

    if (typeof rawUsername !== 'string' || !rawUsername.trim()) {
      throw new InvalidAuthRequestError('A valid username is required.')
    }

    if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      throw new InvalidAuthRequestError('A valid email address is required.')
    }

    if (typeof password !== 'string' || password.length < 6) {
      throw new InvalidAuthRequestError('Password must be at least 6 characters long.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = rawUsername.trim()

    // Check if username is already taken
    const [existingUsernames] = await db.execute<UserRow[]>(
      'SELECT id FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [trimmedName],
    )

    if (existingUsernames.length > 0) {
      response.status(400).json({ error: 'Username is already taken. Please choose another.' })
      return
    }

    // Check if user already exists with this email
    const [existingRows] = await db.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    )

    if (existingRows.length > 0) {
      response.status(409).json({ error: 'An account with this email address already exists.' })
      return
    }

    const id = uuidv4()
    const providerId = `local:${normalizedEmail}`
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      if (await hasRecentlyUsedPassword(connection, id, password)) {
        await connection.rollback()
        response.status(400).json({ error: passwordReuseError })
        return
      }

      const passwordHash = await bcrypt.hash(password, 10)

      await connection.execute<ResultSetHeader>(
        `INSERT INTO users
          (id, provider, provider_id, email, password_hash, name, photo_url, session_version)
         VALUES (?, 'local', ?, ?, ?, ?, NULL, 1)`,
        [id, providerId, normalizedEmail, passwordHash, trimmedName],
      )
      await connection.execute<ResultSetHeader>(
        `INSERT INTO password_history (id, user_id, password_hash)
         VALUES (?, ?, ?)`,
        [uuidv4(), id, passwordHash],
      )

      await connection.commit()
    } catch (error) {
      await connection.rollback().catch(() => undefined)
      throw error
    } finally {
      connection.release()
    }

    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    )
    const userRow = rows[0]

    if (!userRow) {
      throw new Error('Unable to create the user account.')
    }

    sendAuthenticatedUser(request, response, 201, serializeUser(userRow), userRow.session_version ?? 1)
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to register user: %o', error)
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

    // Increment session_version for single active device constraint
    await db.execute<ResultSetHeader>(
      'UPDATE users SET session_version = session_version + 1 WHERE id = ?',
      [userRow.id],
    )
    const newSessionVersion = (userRow.session_version ?? 1) + 1

    sendAuthenticatedUser(request, response, 200, serializeUser(userRow), newSessionVersion)
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to sign in user: %o', error)
    response.status(500).json({ error: 'Unable to sign in.' })
  }
})

router.get('/telegram/config', (_request: Request, response: Response) => {
  try {
    response.set('Cache-Control', 'no-store')
    response.status(200).json({ clientId: requireTelegramClientId() })
  } catch (error) {
    console.error('Unable to load Telegram login configuration: %o', error)
    response.status(503).json({ error: 'Telegram login is not configured.' })
  }
})

router.post(
  '/telegram',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const telegramUser = verifyTelegramAuth(request.body)
      const user = await upsertTelegramUser(telegramUser)

      sendAuthenticatedUser(request, response, 200, serializeUser(user), user.session_version ?? 1)
    } catch (error) {
      if (error instanceof AuthVerificationError) {
        next(new AppError(401, error.message, 'TELEGRAM_AUTH_INVALID'))
        return
      }

      next(error)
    }
  },
)

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
      provider === 'google'
        ? (body.access_token ?? body.credential ?? body.token)
        : (body.credential ?? body.authData ?? body.token)
    )

    if (payload === undefined || payload === null || (typeof payload === 'string' && !payload.trim())) {
      throw new InvalidAuthRequestError(
        provider === 'google'
          ? 'Google access token is required.'
          : 'Authentication payload is required.',
      )
    }

    const identity = await verifyIdentity(provider, payload)
    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE provider_id = ? LIMIT 1',
      [identity.providerId],
    )
    let userRow = rows[0]
    let newSessionVersion = 1

    if (!userRow) {
      const id = uuidv4()

      await db.execute<ResultSetHeader>(
        `INSERT INTO users
          (id, provider, provider_id, email, name, photo_url, session_version)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
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
      newSessionVersion = 1
    } else {
      // Increment session_version for concurrent login prevention
      await db.execute<ResultSetHeader>(
        'UPDATE users SET session_version = session_version + 1 WHERE id = ?',
        [userRow.id],
      )
      newSessionVersion = (userRow.session_version ?? 1) + 1
    }

    if (!userRow) {
      throw new Error('Unable to load the authenticated user.')
    }

    if (userRow.provider !== identity.provider) {
      throw new Error('Provider ID collision detected.')
    }

    sendAuthenticatedUser(request, response, 200, serializeUser(userRow), newSessionVersion)
  } catch (error) {
    if (error instanceof InvalidAuthRequestError) {
      response.status(400).json({ error: error.message, receivedBody: request.body })
      return
    }

    if (error instanceof AuthVerificationError) {
      response.status(401).json({ error: error.message })
      return
    }

    console.error('Unable to create authentication session: %o', error)
    response.status(500).json({ error: 'Unable to create authentication session.' })
  }
})

router.get(
  '/session',
  authenticateRequest,
  async (request: Request, response: Response) => {
    try {
      const [rows] = await db.execute<UserRow[]>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [response.locals.userId as string],
      )
      const userRow = rows[0]

      if (!userRow) {
        clearSessionCookie(request, response)
        response.status(401).json({ error: 'The session user no longer exists.' })
        return
      }

      response.set('Cache-Control', 'no-store')
      response.status(200).json({ user: serializeUser(userRow) })
    } catch (error) {
      console.error('Unable to restore authentication session: %o', error)
      response.status(500).json({ error: 'Unable to restore authentication session.' })
    }
  },
)

router.delete('/session', (request: Request, response: Response) => {
  clearSessionCookie(request, response)
  response.status(204).send()
})

export default router
