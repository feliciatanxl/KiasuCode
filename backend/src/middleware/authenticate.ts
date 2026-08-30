import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { RowDataPacket } from 'mysql2'

import { db } from '../config/db.js'
import { clearSessionCookie, readSessionCookie } from '../utils/session.js'

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

interface UserSessionRow extends RowDataPacket {
  id: string
  session_version: number
}

export async function authenticateRequest(
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

    const userId = payload.sub
    const tokenSessionVersion = typeof payload === 'object' && payload !== null && 'session_version' in payload
      ? Number(payload.session_version)
      : undefined

    const [rows] = await db.execute<UserSessionRow[]>(
      'SELECT id, session_version FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const userRow = rows[0]

    if (!userRow) {
      throw new Error('The user associated with this session no longer exists.')
    }

    if (tokenSessionVersion !== undefined && userRow.session_version !== undefined) {
      if (tokenSessionVersion !== Number(userRow.session_version)) {
        throw new Error('Session version mismatch: superseded by a newer login.')
      }
    }

    response.locals.userId = userId
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
