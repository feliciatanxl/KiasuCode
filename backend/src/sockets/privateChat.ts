import type { Server, Socket } from 'socket.io'
import type { ResultSetHeader } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'

export interface AuthenticatedSocketUser {
  userId: string
  name: string
  photoUrl: string | null
}

export interface PrivateMessagePayload {
  receiverId?: string
  encryptedContent?: string
}

export interface BroadcastPrivateMessage {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  encryptedContent: string
  createdAt: string
}

export function registerPrivateChatHandlers(
  io: Server,
  socket: Socket,
  user: AuthenticatedSocketUser,
): void {
  // Join the user's personal room using their user_id as the room name
  socket.join(user.userId)

  socket.on('send_private_message', async (data: PrivateMessagePayload) => {
    try {
      const receiverId = data?.receiverId?.trim()
      const encryptedContent = data?.encryptedContent?.trim()

      if (!receiverId || !encryptedContent) {
        return
      }

      const messageId = uuidv4()
      const createdAt = new Date().toISOString()

      // Save encrypted message directly to database without ever decrypting
      await db.execute<ResultSetHeader>(
        `INSERT INTO private_messages (id, sender_id, receiver_id, encrypted_content, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [messageId, user.userId, receiverId, encryptedContent],
      )

      const message: BroadcastPrivateMessage = {
        id: messageId,
        senderId: user.userId,
        senderName: user.name,
        receiverId,
        encryptedContent,
        createdAt,
      }

      // Emit directly to the receiver's active socket room (using their user_id as room name)
      io.to(receiverId).emit('private_message', message)

      // Echo back to sender for immediate local feedback
      socket.emit('private_message_sent', message)
    } catch (error) {
      console.error('Error handling private message socket event:', error)
      socket.emit('private_message_error', { error: 'Failed to deliver private message.' })
    }
  })
}
