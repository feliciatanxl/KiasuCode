import { Router, type Request, type Response } from 'express'
import type { RowDataPacket } from 'mysql2/promise'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'

const router = Router()

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function getParam(request: Request, name: string): string {
  const value = request.params[name]
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }
  throw new Error(`Parameter ${name} is required.`)
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Database returned an invalid timestamp.')
  }
  return date.toISOString()
}

// GET /api/messages/:friendId or GET /:friendId - Retrieve encrypted 1-1 message history
const handleGetMessageHistory = async (request: Request, response: Response) => {
  try {
    const friendId = getParam(request, 'friendId')
    const currentUserId = getUserId(response)

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT id, sender_id, receiver_id, encrypted_content, created_at
         FROM private_messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC`,
      [currentUserId, friendId, friendId, currentUserId],
    )

    const messages = rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      encryptedContent: row.encrypted_content,
      createdAt: toIsoString(row.created_at),
    }))

    response.status(200).json({ messages })
  } catch (error) {
    console.error('Unable to retrieve message history: %o', error)
    response.status(500).json({ error: 'Unable to retrieve message history.' })
  }
}

router.get('/:friendId', authenticateRequest, handleGetMessageHistory)
router.get('/messages/:friendId', authenticateRequest, handleGetMessageHistory)

export default router
