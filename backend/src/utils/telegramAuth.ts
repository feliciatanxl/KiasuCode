import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

import { AuthVerificationError } from './auth.js'

const telegramAuthMaxAgeSeconds = 24 * 60 * 60

export interface TelegramAuthData {
  id: number | string
  auth_date: number | string
  hash: string
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  [key: string]: boolean | number | string | undefined
}

export interface VerifiedTelegramUser {
  providerId: string
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
}

function requireBotToken(): string {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()

  if (!botToken) throw new Error('Missing required environment variable: TELEGRAM_BOT_TOKEN')

  return botToken
}

function isTelegramAuthData(value: unknown): value is TelegramAuthData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const data = value as Partial<TelegramAuthData>
  const id = String(data.id ?? '')

  return (
    /^\d+$/.test(id)
    && (typeof data.auth_date === 'number' || typeof data.auth_date === 'string')
    && typeof data.hash === 'string'
    && /^[a-f\d]{64}$/i.test(data.hash)
    && typeof data.first_name === 'string'
    && data.first_name.trim().length > 0
  )
}

export function verifyTelegramAuth(data: unknown): VerifiedTelegramUser {
  if (!isTelegramAuthData(data)) {
    throw new AuthVerificationError('Invalid Telegram authentication payload.')
  }

  const receivedHash = Buffer.from(data.hash, 'hex')
  const dataCheckString = Object.entries(data)
    .filter(([key, value]) => key !== 'hash' && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n')
  const secretKey = createHash('sha256').update(requireBotToken()).digest()
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest()

  if (!timingSafeEqual(expectedHash, receivedHash)) {
    throw new AuthVerificationError('Invalid Telegram authentication hash.')
  }

  const authDate = Number(data.auth_date)
  const currentUnixTime = Math.floor(Date.now() / 1000)

  if (
    !Number.isInteger(authDate)
    || authDate > currentUnixTime + 60
    || currentUnixTime - authDate > telegramAuthMaxAgeSeconds
  ) {
    throw new AuthVerificationError('Telegram authentication payload has expired.')
  }

  return {
    providerId: String(data.id),
    firstName: data.first_name.trim(),
    ...(data.last_name?.trim() ? { lastName: data.last_name.trim() } : {}),
    ...(data.username?.trim() ? { username: data.username.trim() } : {}),
    ...(data.photo_url?.trim() ? { photoUrl: data.photo_url.trim() } : {}),
  }
}
