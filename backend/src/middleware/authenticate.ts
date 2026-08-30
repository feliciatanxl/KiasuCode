import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { clearSessionCookie, readSessionCookie } from '../utils/session.js'

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function authenticateRequest(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const sessionToken = readSessionCookie(request)

  if (!sessionToken) {
    response.status(401).json({
      success: false,
      message: 'Authentication is required.',
      code: 'AUTHENTICATION_REQUIRED',
    })
    return
  }

  try {
    const payload = jwt.verify(
      sessionToken,
      requireEnvironmentVariable('JWT_SECRET'),
      {
        algorithms: ['HS256'],
        issuer: 'kiasucode',
        audience: 'kiasucode-frontend',
      },
    )

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('Session token is missing a subject.')
    }

    response.locals.userId = payload.sub
    next()
  } catch {
    clearSessionCookie(request, response)
    response.status(401).json({
      success: false,
      message: 'The session is invalid or expired.',
      code: 'SESSION_INVALID',
    })
  }
}
