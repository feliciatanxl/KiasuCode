import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../config/db.js'

export async function findTelegramChatIdForUser(userId: string): Promise<string | null> {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT provider, provider_id FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const user = rows[0]
    if (!user) return null

    if (user.provider === 'telegram' && user.provider_id && /^\d+$/.test(user.provider_id)) {
      return user.provider_id
    }

    if (user.provider_id && /^\d+$/.test(user.provider_id)) {
      return user.provider_id
    }

    return null
  } catch (error) {
    console.error('Error finding Telegram chat ID for user:', error)
    return null
  }
}

export async function sendTelegramNotification(
  chatId: string | number,
  text: string,
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()

  if (!botToken) {
    console.log(`[TelegramBot Notification] (Mock/No Token) To Chat ID ${chatId}: "${text}"`)
    return true
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn(`[TelegramBot] Telegram API response error (${response.status}):`, errText)
      return false
    }

    return true
  } catch (error) {
    console.error(`[TelegramBot] Network error sending to ${chatId}:`, error)
    return false
  }
}
