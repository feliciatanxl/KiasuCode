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
  family_name?: string
  picture?: string
}

export async function verifyGoogleToken(
  credential: string,
): Promise<VerifiedGoogleUser> {
  if (!credential || typeof credential !== 'string' || !credential.trim()) {
    throw new AuthVerificationError('Google credential is required.')
  }

  const token = credential.trim()

  // 1. Validate by fetching user profile from Google's userinfo endpoint with Bearer authorization
  try {
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    )

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as Partial<GoogleUserInfo>

      if (profile?.sub) {
        const name =
          profile.name
          || [profile.given_name, profile.family_name].filter(Boolean).join(' ')
          || profile.email
          || 'Google User'

        return {
          providerId: profile.sub,
          name,
          ...(profile.email ? { email: profile.email } : {}),
          ...(profile.picture ? { picture: profile.picture } : {}),
        }
      }
    }
  } catch {
    // Continue to fallback if userinfo fetch fails
  }

  // 2. Fallback: ID Token verification (in case an ID token was provided instead of an access token)
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    const ticket = await googleClient.verifyIdToken(
      clientId
        ? { idToken: token, audience: clientId }
        : { idToken: token },
    )
    const payload = ticket.getPayload()

    if (payload?.sub) {
      const name =
        payload.name
        || payload.given_name
        || payload.email
        || 'Google User'

      return {
        providerId: payload.sub,
        name,
        ...(payload.email ? { email: payload.email } : {}),
        ...(payload.picture ? { picture: payload.picture } : {}),
      }
    }
  } catch {
    // Fallthrough to error
  }

  throw new AuthVerificationError('Invalid Google access token or unable to fetch user profile.')
}
