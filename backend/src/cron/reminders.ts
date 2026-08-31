import cron, { type ScheduledTask } from 'node-cron'
import type { RowDataPacket } from 'mysql2/promise'

import { db } from '../config/db.js'
import { findTelegramChatIdForUser, sendTelegramNotification } from '../utils/telegramBot.js'

interface CountdownReminderRow extends RowDataPacket {
  id: string
  user_id: string
  title: string
  target_date: Date | string
  category: string
  days_diff: number
  user_name: string
}

export async function checkAndSendCountdownReminders(): Promise<number> {
  let remindersSent = 0

  try {
    // Scan for countdowns ending in exactly 1 day or 3 days
    const [rows] = await db.execute<CountdownReminderRow[]>(
      `SELECT c.id, c.user_id, c.title, c.target_date, c.category,
              DATEDIFF(c.target_date, CURRENT_DATE()) AS days_diff,
              u.name AS user_name
         FROM academic_countdowns AS c
         INNER JOIN users AS u ON u.id = c.user_id
        WHERE DATEDIFF(c.target_date, CURRENT_DATE()) IN (1, 3)`,
    )

    for (const item of rows) {
      const telegramChatId = await findTelegramChatIdForUser(item.user_id)

      if (telegramChatId) {
        const daysText = Number(item.days_diff) === 1 ? '1 day (Tomorrow)' : '3 days'
        const message = `⏰ Reminder: Your countdown for ${item.title} is approaching! (${daysText} - Category: ${item.category})`

        const success = await sendTelegramNotification(telegramChatId, message)
        if (success) remindersSent++
      }
    }

    if (remindersSent > 0) {
      console.log(`[Cron Reminders] Sent ${remindersSent} daily countdown Telegram reminder(s).`)
    }
  } catch (error) {
    console.error('[Cron Reminders] Error checking countdown reminders:', error)
  }

  return remindersSent
}

export function initCountdownRemindersCron(): ScheduledTask {
  // Run daily at 09:00 AM (0 9 * * *)
  const task = cron.schedule('0 9 * * *', () => {
    console.log('[Cron Reminders] Running scheduled daily countdown check...')
    void checkAndSendCountdownReminders()
  })

  console.log('[Cron] Daily countdown reminders cron initialized (runs daily at 09:00 AM).')
  return task
}
