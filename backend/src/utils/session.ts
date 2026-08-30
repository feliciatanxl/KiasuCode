import type { CookieOptions, Request, Response } from 'express'

export const sessionCookieName = 'kiasucode_session'
export const sessionMaxAgeMs = 60 * 60 * 1000

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: sessionMaxAgeMs,
    path: '/',
  }
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(sessionCookieName, token, sessionCookieOptions())
}

export function clearSessionCookie(response: Response): void {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions()
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
