import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

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
  const authorization = request.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Authentication is required.' })
    return
  }

  try {
    const payload = jwt.verify(
      authorization.slice('Bearer '.length),
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
    response.status(401).json({ error: 'The session is invalid or expired.' })
  }
}
