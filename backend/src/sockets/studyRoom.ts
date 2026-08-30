import type { Server as HttpServer } from 'node:http'
import type { ChatMessage, RoomParticipant, RoomState, UserPresence } from '@kiasucode/shared'
import jwt from 'jsonwebtoken'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { Server, type Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { sessionCookieName } from '../utils/session.js'

interface UserLookupRow extends RowDataPacket {
  id: string
  name: string
  photo_url: string | null
  session_version?: number
}

interface AuthenticatedSocketData {
  userId: string
  name: string
  photoUrl: string | null
}

interface RoomInternalState {
  roomId: string
  status: 'idle' | 'running' | 'paused' | 'completed'
  durationSeconds: number
  remainingSeconds: number
  participants: Map<string, { socketId: string; user: AuthenticatedSocketData; joinedAt: string }>
  timerInterval: NodeJS.Timeout | null
}

interface UserPresenceRecord {
  socketIds: Set<string>
  user: AuthenticatedSocketData
  status: 'online' | 'offline'
  roomId: string | null
}

const DEFAULT_ROOM_ID = 'general'
const DEFAULT_DURATION_SECONDS = 25 * 60 // 25 minutes
const COINS_PER_SESSION = 25

const rooms = new Map<string, RoomInternalState>()
const userPresenceMap = new Map<string, UserPresenceRecord>()

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex < 0) continue
    if (cookie.slice(0, separatorIndex).trim() === name) {
      try {
        return decodeURIComponent(cookie.slice(separatorIndex + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

function getOrCreateRoom(roomId: string): RoomInternalState {
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      roomId,
      status: 'idle',
      durationSeconds: DEFAULT_DURATION_SECONDS,
      remainingSeconds: DEFAULT_DURATION_SECONDS,
      participants: new Map(),
      timerInterval: null,
    }
    rooms.set(roomId, room)
  }
  return room
}

function serializeRoomState(room: RoomInternalState): RoomState {
  const participantsMap = new Map<string, RoomParticipant>()

  // Deduplicate participants by userId (in case user opened multiple tabs)
  for (const entry of room.participants.values()) {
    if (!participantsMap.has(entry.user.userId)) {
      participantsMap.set(entry.user.userId, {
        userId: entry.user.userId,
        name: entry.user.name,
        photoUrl: entry.user.photoUrl,
        joinedAt: entry.joinedAt,
      })
    }
  }

  return {
    roomId: room.roomId,
    status: room.status,
    durationSeconds: room.durationSeconds,
    remainingSeconds: room.remainingSeconds,
    participants: Array.from(participantsMap.values()),
  }
}

async function awardRoomParticipantsCoins(room: RoomInternalState): Promise<void> {
  const distinctUserIds = Array.from(
    new Set(Array.from(room.participants.values()).map((p) => p.user.userId)),
  )

  if (distinctUserIds.length === 0) return

  for (const userId of distinctUserIds) {
    try {
      const sessionId = uuidv4()
      // Insert study session (module_id fallback or general study block)
      const [modules] = await db.execute<RowDataPacket[]>(
        `SELECT m.id FROM modules m INNER JOIN semesters s ON s.id = m.semester_id INNER JOIN institutions i ON i.id = s.institution_id WHERE i.user_id = ? LIMIT 1`,
        [userId],
      )
      const moduleId = modules[0]?.id ?? null

      if (moduleId) {
        await db.execute<ResultSetHeader>(
          `INSERT INTO study_sessions (id, user_id, module_id, duration_minutes) VALUES (?, ?, ?, ?)`,
          [sessionId, userId, moduleId, 25],
        )
      }

      await db.execute<ResultSetHeader>(
        `INSERT INTO user_wallets (user_id, coins_balance) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE coins_balance = coins_balance + ?`,
        [userId, COINS_PER_SESSION, COINS_PER_SESSION],
      )
    } catch (error) {
      console.error('Unable to award coins for user %s: %o', userId, error)
    }
  }
}

function broadcastUserPresence(io: Server, userId: string, status: 'online' | 'offline', roomId: string | null): void {
  const payload: UserPresence = {
    userId,
    status,
    roomId,
  }
  io.emit('presence_update', payload)
}

function getInitialPresenceMap(): Record<string, { status: 'online' | 'offline'; roomId: string | null }> {
  const result: Record<string, { status: 'online' | 'offline'; roomId: string | null }> = {}
  for (const [uid, record] of userPresenceMap.entries()) {
    if (record.status === 'online') {
      result[uid] = {
        status: 'online',
        roomId: record.roomId,
      }
    }
  }
  return result
}

export function setupStudyRoomSocket(httpServer: HttpServer, allowedOrigins: string[]): Server {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  // Middleware: Authenticate socket connection via session cookie
  io.use(async (socket: Socket, next) => {
    try {
      const token = parseCookie(socket.handshake.headers.cookie, sessionCookieName)
      if (!token) {
        return next(new Error('AUTHENTICATION_REQUIRED'))
      }

      const jwtSecret = process.env.JWT_SECRET?.trim()
      if (!jwtSecret) {
        return next(new Error('SERVER_MISCONFIGURATION'))
      }

      const payload = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'kiasucode',
        audience: 'kiasucode-frontend',
      })

      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return next(new Error('INVALID_SESSION'))
      }

      const userId = payload.sub
      const tokenSessionVersion = typeof payload === 'object' && payload !== null && 'session_version' in payload
        ? Number(payload.session_version)
        : undefined

      const [rows] = await db.execute<UserLookupRow[]>(
        `SELECT id, name, photo_url, session_version FROM users WHERE id = ? LIMIT 1`,
        [userId],
      )

      const userRow = rows[0]
      if (!userRow) {
        return next(new Error('USER_NOT_FOUND'))
      }

      if (tokenSessionVersion !== undefined && userRow.session_version !== undefined) {
        if (tokenSessionVersion !== Number(userRow.session_version)) {
          return next(new Error('SESSION_SUPERSEDED'))
        }
      }

      socket.data = {
        userId: userRow.id,
        name: userRow.name,
        photoUrl: userRow.photo_url,
      } as AuthenticatedSocketData

      next()
    } catch {
      next(new Error('AUTHENTICATION_FAILED'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data as AuthenticatedSocketData

    // Register user presence
    let presence = userPresenceMap.get(user.userId)
    if (!presence) {
      presence = {
        socketIds: new Set([socket.id]),
        user,
        status: 'online',
        roomId: null,
      }
      userPresenceMap.set(user.userId, presence)
    } else {
      presence.socketIds.add(socket.id)
      presence.status = 'online'
    }

    // Send initial presence map to newly connected user
    socket.emit('initial_presence', getInitialPresenceMap())
    broadcastUserPresence(io, user.userId, 'online', presence.roomId)

    socket.on('join_room', (data: { roomId?: string }) => {
      const roomId = data?.roomId?.trim() || DEFAULT_ROOM_ID

      // Leave previous rooms if any
      for (const currentRoomId of socket.rooms) {
        if (currentRoomId !== socket.id && currentRoomId !== roomId) {
          socket.leave(currentRoomId)
          const oldRoom = rooms.get(currentRoomId)
          if (oldRoom) {
            oldRoom.participants.delete(socket.id)
            if (oldRoom.participants.size === 0 && oldRoom.timerInterval) {
              clearInterval(oldRoom.timerInterval)
              oldRoom.timerInterval = null
              oldRoom.status = 'idle'
              oldRoom.remainingSeconds = DEFAULT_DURATION_SECONDS
            }
            io.to(currentRoomId).emit('room_state', serializeRoomState(oldRoom))
          }
        }
      }

      const room = getOrCreateRoom(roomId)
      socket.join(roomId)
      room.participants.set(socket.id, {
        socketId: socket.id,
        user,
        joinedAt: new Date().toISOString(),
      })

      // Update presence
      const userPres = userPresenceMap.get(user.userId)
      if (userPres) {
        userPres.roomId = roomId
        broadcastUserPresence(io, user.userId, 'online', roomId)
      }

      // Send initial room state to joining client and broadcast to room
      io.to(roomId).emit('room_state', serializeRoomState(room))
    })

    socket.on('leave_room', (data: { roomId?: string }) => {
      const roomId = data?.roomId?.trim() || DEFAULT_ROOM_ID
      socket.leave(roomId)
      const room = rooms.get(roomId)
      if (room) {
        room.participants.delete(socket.id)
        if (room.participants.size === 0 && room.timerInterval) {
          clearInterval(room.timerInterval)
          room.timerInterval = null
          room.status = 'idle'
          room.remainingSeconds = DEFAULT_DURATION_SECONDS
        }
        io.to(roomId).emit('room_state', serializeRoomState(room))
      }

      // Update presence
      const userPres = userPresenceMap.get(user.userId)
      if (userPres) {
        userPres.roomId = null
        broadcastUserPresence(io, user.userId, 'online', null)
      }
    })

    socket.on('send_message', (data: { roomId?: string; message?: string }) => {
      const roomId = data?.roomId?.trim() || DEFAULT_ROOM_ID
      const rawMessage = typeof data?.message === 'string' ? data.message.trim() : ''

      if (!rawMessage || rawMessage.length > 500) {
        return
      }

      const chatMessage: ChatMessage = {
        id: uuidv4(),
        roomId,
        userId: user.userId,
        userName: user.name,
        userPhotoUrl: user.photoUrl,
        message: rawMessage,
        timestamp: new Date().toISOString(),
      }

      // Broadcast message only to participants in this room
      io.to(roomId).emit('chat_message', chatMessage)
    })

    socket.on('timer_start', (data: { roomId?: string }) => {
      const roomId = data?.roomId?.trim() || DEFAULT_ROOM_ID
      const room = getOrCreateRoom(roomId)

      if (room.status === 'running') return

      if (room.remainingSeconds <= 0) {
        room.remainingSeconds = DEFAULT_DURATION_SECONDS
      }

      room.status = 'running'
      io.to(roomId).emit('room_state', serializeRoomState(room))

      if (room.timerInterval) {
        clearInterval(room.timerInterval)
      }

      room.timerInterval = setInterval(() => {
        if (room.remainingSeconds > 0) {
          room.remainingSeconds -= 1
          io.to(roomId).emit('timer_tick', {
            roomId: room.roomId,
            remainingSeconds: room.remainingSeconds,
            status: room.status,
          })
        }

        if (room.remainingSeconds <= 0) {
          if (room.timerInterval) clearInterval(room.timerInterval)
          room.timerInterval = null
          room.status = 'completed'

          void awardRoomParticipantsCoins(room)

          io.to(roomId).emit('timer_complete', {
            roomId: room.roomId,
            coinsEarned: COINS_PER_SESSION,
            completedAt: new Date().toISOString(),
          })

          io.to(roomId).emit('room_state', serializeRoomState(room))
        }
      }, 1000)
    })

    socket.on('timer_reset', (data: { roomId?: string }) => {
      const roomId = data?.roomId?.trim() || DEFAULT_ROOM_ID
      const room = getOrCreateRoom(roomId)

      if (room.timerInterval) {
        clearInterval(room.timerInterval)
        room.timerInterval = null
      }

      room.status = 'idle'
      room.remainingSeconds = DEFAULT_DURATION_SECONDS
      io.to(roomId).emit('room_state', serializeRoomState(room))
    })

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue
        const room = rooms.get(roomId)
        if (room) {
          room.participants.delete(socket.id)
          if (room.participants.size === 0 && room.timerInterval) {
            clearInterval(room.timerInterval)
            room.timerInterval = null
            room.status = 'idle'
            room.remainingSeconds = DEFAULT_DURATION_SECONDS
          }
          io.to(roomId).emit('room_state', serializeRoomState(room))
        }
      }

      const userPres = userPresenceMap.get(user.userId)
      if (userPres) {
        userPres.socketIds.delete(socket.id)
        if (userPres.socketIds.size === 0) {
          userPres.status = 'offline'
          userPres.roomId = null
          userPresenceMap.delete(user.userId)
          broadcastUserPresence(io, user.userId, 'offline', null)
        }
      }
    })
  })

  return io
}
