import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import type { FriendshipItem, FriendshipStatus } from '@kiasucode/shared'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'

interface UserLookupRow extends RowDataPacket {
  id: string
  name: string
  email: string | null
  photo_url: string | null
}

interface FriendshipDbRow extends RowDataPacket {
  id: string
  status: FriendshipStatus
  requester_id: string
  addressee_id: string
  created_at: Date | string
  friend_id: string
  friend_name: string
  friend_email: string | null
  friend_photo_url: string | null
}

const router = Router()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

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
  throw new AppError(400, `Parameter ${name} is required.`, `INVALID_${name.toUpperCase()}`)
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Database returned an invalid timestamp.')
  }
  return date.toISOString()
}

function serializeFriendship(row: FriendshipDbRow, currentUserId: string): FriendshipItem {
  return {
    id: row.id,
    status: row.status,
    isRequester: row.requester_id === currentUserId,
    createdAt: toIsoString(row.created_at),
    friend: {
      id: row.friend_id,
      name: row.friend_name,
      email: row.friend_email,
      photoUrl: row.friend_photo_url,
    },
  }
}

// GET /api/friends - List all accepted friends
router.get(
  '/friends',
  authenticateRequest,
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const currentUserId = getUserId(response)

      const [rows] = await db.execute<FriendshipDbRow[]>(
        `SELECT 
           f.id,
           f.status,
           f.requester_id,
           f.addressee_id,
           f.created_at,
           u.id AS friend_id,
           u.name AS friend_name,
           u.email AS friend_email,
           u.photo_url AS friend_photo_url
         FROM friendships f
         INNER JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
         WHERE (f.requester_id = ? OR f.addressee_id = ?)
           AND f.status = 'Accepted'
         ORDER BY u.name ASC`,
        [currentUserId, currentUserId, currentUserId],
      )

      response.status(200).json({
        friends: rows.map((row) => serializeFriendship(row, currentUserId)),
      })
    } catch (error) {
      next(error)
    }
  },
)

// GET /api/friends/requests - List pending incoming and outgoing friend requests
router.get(
  '/friends/requests',
  authenticateRequest,
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const currentUserId = getUserId(response)

      const [incomingRows] = await db.execute<FriendshipDbRow[]>(
        `SELECT 
           f.id,
           f.status,
           f.requester_id,
           f.addressee_id,
           f.created_at,
           u.id AS friend_id,
           u.name AS friend_name,
           u.email AS friend_email,
           u.photo_url AS friend_photo_url
         FROM friendships f
         INNER JOIN users u ON u.id = f.requester_id
         WHERE f.addressee_id = ? AND f.status = 'Pending'
         ORDER BY f.created_at DESC`,
        [currentUserId],
      )

      const [outgoingRows] = await db.execute<FriendshipDbRow[]>(
        `SELECT 
           f.id,
           f.status,
           f.requester_id,
           f.addressee_id,
           f.created_at,
           u.id AS friend_id,
           u.name AS friend_name,
           u.email AS friend_email,
           u.photo_url AS friend_photo_url
         FROM friendships f
         INNER JOIN users u ON u.id = f.addressee_id
         WHERE f.requester_id = ? AND f.status = 'Pending'
         ORDER BY f.created_at DESC`,
        [currentUserId],
      )

      response.status(200).json({
        incoming: incomingRows.map((r) => serializeFriendship(r, currentUserId)),
        outgoing: outgoingRows.map((r) => serializeFriendship(r, currentUserId)),
      })
    } catch (error) {
      next(error)
    }
  },
)

// POST /api/friends/request - Send a friend request
router.post(
  '/friends/request',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!isRecord(request.body)) {
        throw new AppError(400, 'A JSON request body is required.', 'INVALID_REQUEST_BODY')
      }

      const rawTarget = request.body.target ?? request.body.email ?? request.body.username
      if (typeof rawTarget !== 'string' || !rawTarget.trim()) {
        throw new AppError(400, 'Friend email or username is required.', 'INVALID_TARGET')
      }

      const target = rawTarget.trim().toLowerCase()
      const currentUserId = getUserId(response)

      // Lookup target user by email, name, provider_id, or ID
      const [users] = await db.execute<UserLookupRow[]>(
        `SELECT id, name, email, photo_url
           FROM users
          WHERE LOWER(email) = ?
             OR LOWER(name) = ?
             OR provider_id = ?
             OR id = ?
          LIMIT 1`,
        [target, target, target, target],
      )

      const addressee = users[0]
      if (!addressee) {
        throw new AppError(404, 'User not found with the provided email or username.', 'USER_NOT_FOUND')
      }

      if (addressee.id === currentUserId) {
        throw new AppError(400, 'You cannot send a friend request to yourself.', 'SELF_REQUEST')
      }

      // Check existing friendship
      const [existing] = await db.execute<RowDataPacket[]>(
        `SELECT id, requester_id, addressee_id, status
           FROM friendships
          WHERE (requester_id = ? AND addressee_id = ?)
             OR (requester_id = ? AND addressee_id = ?)
          LIMIT 1`,
        [currentUserId, addressee.id, addressee.id, currentUserId],
      )

      if (existing[0]) {
        const existingStatus = existing[0].status
        if (existingStatus === 'Accepted') {
          throw new AppError(409, 'You are already friends with this user.', 'ALREADY_FRIENDS')
        }
        if (existing[0].requester_id === currentUserId) {
          throw new AppError(409, 'Friend request already sent.', 'REQUEST_PENDING')
        } else {
          // If the other user already requested us, automatically accept!
          await db.execute<ResultSetHeader>(
            `UPDATE friendships SET status = 'Accepted' WHERE id = ?`,
            [existing[0].id],
          )
          response.status(200).json({
            success: true,
            message: `Friend request accepted! You and ${addressee.name} are now connected.`,
          })
          return
        }
      }

      const friendshipId = uuidv4()
      await db.execute<ResultSetHeader>(
        `INSERT INTO friendships (id, requester_id, addressee_id, status)
         VALUES (?, ?, ?, 'Pending')`,
        [friendshipId, currentUserId, addressee.id],
      )

      response.status(201).json({
        success: true,
        message: `Friend request sent to ${addressee.name}.`,
        friendshipId,
      })
    } catch (error) {
      next(error)
    }
  },
)

// POST /api/friends/:id/accept - Accept a friend request
router.post(
  '/friends/:id/accept',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const friendshipId = getParam(request, 'id')
      const currentUserId = getUserId(response)

      const [result] = await db.execute<ResultSetHeader>(
        `UPDATE friendships
            SET status = 'Accepted'
          WHERE id = ? AND addressee_id = ? AND status = 'Pending'`,
        [friendshipId, currentUserId],
      )

      if (result.affectedRows === 0) {
        throw new AppError(404, 'Pending friend request not found.', 'REQUEST_NOT_FOUND')
      }

      response.status(200).json({ success: true, message: 'Friend request accepted.' })
    } catch (error) {
      next(error)
    }
  },
)

// DELETE /api/friends/:id - Remove a friend or cancel/reject request
router.delete(
  '/friends/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const friendshipId = getParam(request, 'id')
      const currentUserId = getUserId(response)

      const [result] = await db.execute<ResultSetHeader>(
        `DELETE FROM friendships
          WHERE id = ? AND (requester_id = ? OR addressee_id = ?)`,
        [friendshipId, currentUserId, currentUserId],
      )

      if (result.affectedRows === 0) {
        throw new AppError(404, 'Friendship not found.', 'FRIENDSHIP_NOT_FOUND')
      }

      response.status(200).json({ success: true, message: 'Friendship removed.' })
    } catch (error) {
      next(error)
    }
  },
)

export default router
