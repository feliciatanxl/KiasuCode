import type { CookieOptions, Request, Response } from 'express'

export const sessionCookieName = 'kiasucode_session'
export const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000

const isProduction = process.env.NODE_ENV === 'production'

function requestRequiresSecureCookie(request: Request): boolean {
  const requestHosts = [
    request.headers.origin,
    request.headers.host,
    request.headers['x-forwarded-host'],
  ]
    .flatMap((value) => typeof value === 'string' ? [value] : value ?? [])
    .map((value) => value.toLowerCase())
  const forwardedProtocol = request.headers['x-forwarded-proto']
  const isForwardedHttps = typeof forwardedProtocol === 'string'
    && forwardedProtocol.split(',')[0]?.trim().toLowerCase() === 'https'
  const isNgrok = requestHosts.some((value) => value.includes('ngrok'))

  return isProduction || request.secure || isForwardedHttps || isNgrok
}

function sessionCookieOptions(request: Request): CookieOptions {
  const requireSecure = requestRequiresSecureCookie(request)

  return {
    httpOnly: true,
    secure: requireSecure,
    sameSite: requireSecure ? 'none' : 'lax',
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
