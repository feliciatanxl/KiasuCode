import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import type { ClassScheduleItem, CreateScheduleInput, DayOfWeek } from '@kiasucode/shared'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'

interface ScheduleRow extends RowDataPacket {
  id: string
  user_id: string
  color: string
  title: string
  instructor: string | null
  room_location: string | null
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  created_at: Date | string
}

const router = Router()
const validDays = new Set<DayOfWeek>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])

// Auto-ensure table exists on startup
async function ensureScheduleTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS class_schedules (
        id CHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        color VARCHAR(30) NOT NULL DEFAULT '#3b82f6',
        title VARCHAR(255) NOT NULL,
        instructor VARCHAR(255) NULL,
        room_location VARCHAR(255) NULL,
        day_of_week ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_class_schedules_user_day (user_id, day_of_week)
      ) ENGINE = InnoDB
        DEFAULT CHARACTER SET = utf8mb4
        COLLATE = utf8mb4_0900_ai_ci;
    `)
  } catch (err) {
    console.error('[Schedule] Failed to ensure class_schedules table:', err)
  }
}
void ensureScheduleTable()

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function serializeSchedule(row: ScheduleRow): ClassScheduleItem {
  return {
    id: row.id,
    userId: row.user_id,
    color: row.color || '#3b82f6',
    title: row.title,
    instructor: row.instructor,
    roomLocation: row.room_location,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    ...(row.created_at ? { createdAt: new Date(row.created_at).toISOString() } : {}),
  }
}

// GET /api/schedules & /api/schedule
const getSchedulesHandler = async (
  _request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(response)
    const [rows] = await db.execute<ScheduleRow[]>(
      `SELECT id, user_id, color, title, instructor, room_location, day_of_week, start_time, end_time, created_at
         FROM class_schedules
        WHERE user_id = ?
        ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'), start_time ASC`,
      [userId],
    )

    response.status(200).json({ schedules: rows.map(serializeSchedule) })
  } catch (error) {
    next(error)
  }
}
router.get('/schedules', authenticateRequest, getSchedulesHandler)
router.get('/schedule', authenticateRequest, getSchedulesHandler)

// POST /api/schedules & /api/schedule
const createScheduleHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(response)
    const { color, title, instructor, roomLocation, dayOfWeek, startTime, endTime } =
      request.body as CreateScheduleInput

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError(400, 'Title is required.', 'INVALID_TITLE')
    }
    if (!dayOfWeek || !validDays.has(dayOfWeek)) {
      throw new AppError(400, 'Valid day of week is required.', 'INVALID_DAY')
    }
    if (!startTime || typeof startTime !== 'string' || !startTime.trim()) {
      throw new AppError(400, 'Start time is required.', 'INVALID_START_TIME')
    }
    if (!endTime || typeof endTime !== 'string' || !endTime.trim()) {
      throw new AppError(400, 'End time is required.', 'INVALID_END_TIME')
    }

    const id = uuidv4()
    const chosenColor = typeof color === 'string' && color.trim() ? color.trim() : '#3b82f6'

    await db.execute<ResultSetHeader>(
      `INSERT INTO class_schedules (id, user_id, color, title, instructor, room_location, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        chosenColor,
        title.trim(),
        instructor?.trim() || null,
        roomLocation?.trim() || null,
        dayOfWeek,
        startTime.trim(),
        endTime.trim(),
      ],
    )

    const [rows] = await db.execute<ScheduleRow[]>(
      `SELECT id, user_id, color, title, instructor, room_location, day_of_week, start_time, end_time, created_at
         FROM class_schedules
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [id, userId],
    )

    const created = rows[0]
    if (!created) throw new Error('Failed to retrieve created class schedule.')

    response.status(201).json({ schedule: serializeSchedule(created) })
  } catch (error) {
    next(error)
  }
}
router.post('/schedules', authenticateRequest, createScheduleHandler)
router.post('/schedule', authenticateRequest, createScheduleHandler)

// PATCH & PUT /api/schedules/:id & /api/schedule/:id
const updateScheduleHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(response)
    const id = String(request.params.id || '').trim()
    if (!id) throw new AppError(400, 'ID is required.', 'INVALID_ID')
    const { color, title, instructor, roomLocation, dayOfWeek, startTime, endTime } =
      request.body as {
        color?: string
        title?: string
        instructor?: string | null
        roomLocation?: string | null
        dayOfWeek?: DayOfWeek
        startTime?: string
        endTime?: string
      }

    const [existing] = await db.execute<ScheduleRow[]>(
      `SELECT id, user_id, color, title, instructor, room_location, day_of_week, start_time, end_time, created_at
         FROM class_schedules
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [id, userId],
    )

    if (!existing[0]) {
      throw new AppError(404, 'Class schedule not found.', 'SCHEDULE_NOT_FOUND')
    }

    const current = existing[0]
    const updatedColor = typeof color === 'string' && color.trim() ? color.trim() : current.color
    const updatedTitle = typeof title === 'string' && title.trim() ? title.trim() : current.title
    const updatedInstructor = instructor !== undefined ? (instructor?.trim() || null) : current.instructor
    const updatedLocation = roomLocation !== undefined ? (roomLocation?.trim() || null) : current.room_location
    const updatedDay = dayOfWeek && validDays.has(dayOfWeek) ? dayOfWeek : current.day_of_week
    const updatedStart = typeof startTime === 'string' && startTime.trim() ? startTime.trim() : current.start_time
    const updatedEnd = typeof endTime === 'string' && endTime.trim() ? endTime.trim() : current.end_time

    await db.execute<ResultSetHeader>(
      `UPDATE class_schedules
          SET color = ?, title = ?, instructor = ?, room_location = ?, day_of_week = ?, start_time = ?, end_time = ?
        WHERE id = ? AND user_id = ?`,
      [
        updatedColor,
        updatedTitle,
        updatedInstructor,
        updatedLocation,
        updatedDay,
        updatedStart,
        updatedEnd,
        id,
        userId,
      ],
    )

    const [rows] = await db.execute<ScheduleRow[]>(
      `SELECT id, user_id, color, title, instructor, room_location, day_of_week, start_time, end_time, created_at
         FROM class_schedules
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [id, userId],
    )

    response.status(200).json({ schedule: serializeSchedule(rows[0]!) })
  } catch (error) {
    next(error)
  }
}
router.patch('/schedules/:id', authenticateRequest, updateScheduleHandler)
router.put('/schedules/:id', authenticateRequest, updateScheduleHandler)
router.patch('/schedule/:id', authenticateRequest, updateScheduleHandler)
router.put('/schedule/:id', authenticateRequest, updateScheduleHandler)

// DELETE /api/schedules/:id & /api/schedule/:id
const deleteScheduleHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(response)
    const id = String(request.params.id || '').trim()
    if (!id) throw new AppError(400, 'ID is required.', 'INVALID_ID')

    const [result] = await db.execute<ResultSetHeader>(
      `DELETE FROM class_schedules WHERE id = ? AND user_id = ?`,
      [id, userId],
    )

    if (result.affectedRows === 0) {
      throw new AppError(404, 'Class schedule not found.', 'SCHEDULE_NOT_FOUND')
    }

    response.status(200).json({ success: true, message: 'Schedule deleted successfully.' })
  } catch (error) {
    next(error)
  }
}
router.delete('/schedules/:id', authenticateRequest, deleteScheduleHandler)
router.delete('/schedule/:id', authenticateRequest, deleteScheduleHandler)

export default router
