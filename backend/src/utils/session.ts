import type { CookieOptions, Request, Response } from 'express'

export const sessionCookieName = 'kiasucode_session'
export const sessionMaxAgeMs = 3600000 // Exactly 1 hour (3600000 milliseconds)

function sessionCookieOptions(_request?: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: sessionMaxAgeMs,
    path: '/',
  }
}

export function setSessionCookie(
  request: Request,
  response: Response,
  token: string,
): void {
  response.cookie(sessionCookieName, token, sessionCookieOptions(request))
}

export function clearSessionCookie(request: Request, response: Response): void {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions(request)
  response.clearCookie(sessionCookieName, options)
}

export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) return null

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=')

    if (separatorIndex < 0) continue

    const name = cookie.slice(0, separatorIndex).trim()

    if (name !== sessionCookieName) continue

    const value = cookie.slice(separatorIndex + 1).trim()

    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }

  return null
}
