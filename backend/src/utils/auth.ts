import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client()

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

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
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
