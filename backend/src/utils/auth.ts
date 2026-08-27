import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client()
const telegramAuthMaxAgeSeconds = 24 * 60 * 60

export class AuthVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthVerificationError'
  }
}

export interface VerifiedGoogleUser {
  providerId: string
  email?: string
  name: string
  picture?: string
}

interface GoogleUserInfo {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  picture?: string
}

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

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function isTelegramAuthData(value: unknown): value is TelegramAuthData {
  if (!value || typeof value !== 'object') return false

  const data = value as Partial<TelegramAuthData>

  return (
    (typeof data.id === 'number' || typeof data.id === 'string') &&
    (typeof data.auth_date === 'number' || typeof data.auth_date === 'string') &&
    typeof data.hash === 'string' &&
    typeof data.first_name === 'string'
  )
}

export async function verifyGoogleToken(
  credential: string,
): Promise<VerifiedGoogleUser> {
  if (!credential.trim()) {
    throw new AuthVerificationError('Google credential is required.')
  }

  const clientId = requireEnvironmentVariable('GOOGLE_CLIENT_ID')

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    const payload = ticket.getPayload()

    if (!payload?.sub) {
      throw new AuthVerificationError('Google token is missing a subject.')
    }

    const name = payload.name ?? payload.given_name ?? payload.email

    if (!name) {
      throw new AuthVerificationError('Google token is missing a user name.')
    }

    return {
      providerId: payload.sub,
      name,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.picture ? { picture: payload.picture } : {}),
    }
  } catch (idTokenError) {
    if (idTokenError instanceof AuthVerificationError) throw idTokenError
  }

  try {
    const tokenInfo = await googleClient.getTokenInfo(credential)

    if (tokenInfo.aud !== clientId) {
      throw new AuthVerificationError('Google token was issued for another application.')
    }

    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${credential}`,
          Accept: 'application/json',
        },
      },
    )

    if (!profileResponse.ok) {
      throw new AuthVerificationError('Unable to load the Google user profile.')
    }

    const profile = await profileResponse.json() as Partial<GoogleUserInfo>

    if (!profile.sub || (tokenInfo.sub && tokenInfo.sub !== profile.sub)) {
      throw new AuthVerificationError('Google token subject does not match the user profile.')
    }

    const name = profile.name ?? profile.given_name ?? profile.email

    if (!name) {
      throw new AuthVerificationError('Google profile is missing a user name.')
    }

    return {
      providerId: profile.sub,
      name,
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.picture ? { picture: profile.picture } : {}),
    }
  } catch (error) {
    if (error instanceof AuthVerificationError) throw error

    throw new AuthVerificationError('Invalid Google credential.')
  }
}

export function verifyTelegramAuth(data: unknown): VerifiedTelegramUser {
  if (!isTelegramAuthData(data)) {
    throw new AuthVerificationError('Invalid Telegram authentication payload.')
  }

  const botToken = requireEnvironmentVariable('TELEGRAM_BOT_TOKEN')
  const receivedHash = Buffer.from(data.hash, 'hex')

  if (receivedHash.length !== 32) {
    throw new AuthVerificationError('Invalid Telegram authentication hash.')
  }

  const dataCheckString = Object.entries(data)
    .filter(([key, value]) => key !== 'hash' && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n')
  const secretKey = createHash('sha256').update(botToken).digest()
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest()

  if (!timingSafeEqual(expectedHash, receivedHash)) {
    throw new AuthVerificationError('Invalid Telegram authentication hash.')
  }

  const authDate = Number(data.auth_date)
  const currentUnixTime = Math.floor(Date.now() / 1000)

  if (
    !Number.isInteger(authDate) ||
    authDate > currentUnixTime + 60 ||
    currentUnixTime - authDate > telegramAuthMaxAgeSeconds
  ) {
    throw new AuthVerificationError('Telegram authentication payload has expired.')
  }

  return {
    providerId: String(data.id),
    firstName: data.first_name,
    ...(data.last_name ? { lastName: data.last_name } : {}),
    ...(data.username ? { username: data.username } : {}),
    ...(data.photo_url ? { photoUrl: data.photo_url } : {}),
  }
}
