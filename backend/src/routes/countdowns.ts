import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import type {
  AcademicCountdown,
  CountdownCategory,
  CreateCountdownInput,
} from '@kiasucode/shared'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'

interface CountdownRow extends RowDataPacket {
  id: string
  module_id: string | null
  title: string
  target_date: Date | string
  category: CountdownCategory
  created_at: Date | string
}

const router = Router()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function getCountdownId(request: Request): string {
  const countdownId = request.params.id

  if (typeof countdownId !== 'string' || !countdownId.trim()) {
    throw new AppError(400, 'Countdown ID is required.', 'INVALID_COUNTDOWN_ID')
  }

  return countdownId.trim()
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Database returned an invalid countdown timestamp.')
  }

  return date.toISOString()
}

function serializeCountdown(row: CountdownRow): AcademicCountdown {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    targetDate: toIsoString(row.target_date),
    category: row.category,
    createdAt: toIsoString(row.created_at),
  }
}

function parseCreateCountdownInput(body: unknown): CreateCountdownInput {
  if (!isRecord(body)) {
    throw new AppError(400, 'A JSON request body is required.', 'INVALID_REQUEST_BODY')
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const rawTargetDate = body.targetDate ?? body.target_date
  const targetDate = typeof rawTargetDate === 'string'
    ? new Date(rawTargetDate)
    : new Date(Number.NaN)
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const rawModuleId = body.moduleId ?? body.module_id ?? null
  const moduleId = typeof rawModuleId === 'string' && rawModuleId.trim()
    ? rawModuleId.trim()
    : null

  if (!title || title.length > 255) {
    throw new AppError(
      400,
      'Countdown title must be between 1 and 255 characters.',
      'INVALID_COUNTDOWN_TITLE',
    )
  }

  if (Number.isNaN(targetDate.getTime())) {
    throw new AppError(400, 'Target date must be a valid date and time.', 'INVALID_TARGET_DATE')
  }

  if (!category || category.length > 50) {
    throw new AppError(
      400,
      'Countdown category must be between 1 and 50 characters.',
      'INVALID_COUNTDOWN_CATEGORY',
    )
  }

  if (moduleId && moduleId.length !== 36) {
    throw new AppError(400, 'Module ID is invalid.', 'INVALID_MODULE_ID')
  }

  return {
    title,
    targetDate: targetDate.toISOString(),
    category,
    moduleId,
  }
}

router.get(
  '/countdowns',
  authenticateRequest,
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const [rows] = await db.execute<CountdownRow[]>(
        `SELECT id, module_id, title, target_date, category, created_at
           FROM academic_countdowns
          WHERE user_id = ?
          ORDER BY target_date ASC, created_at ASC`,
        [getUserId(response)],
      )

      response.status(200).json({ countdowns: rows.map(serializeCountdown) })
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/countdowns',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = parseCreateCountdownInput(request.body)
      const userId = getUserId(response)

      if (input.moduleId) {
        const [moduleRows] = await db.execute<RowDataPacket[]>(
          `SELECT m.id
             FROM modules AS m
             INNER JOIN semesters AS s ON s.id = m.semester_id
             INNER JOIN institutions AS i ON i.id = s.institution_id
            WHERE m.id = ? AND i.user_id = ?
            LIMIT 1`,
          [input.moduleId, userId],
        )

        if (!moduleRows[0]) {
          throw new AppError(404, 'Module not found.', 'MODULE_NOT_FOUND')
        }
      }

      const countdownId = uuidv4()
      await db.execute<ResultSetHeader>(
        `INSERT INTO academic_countdowns
          (id, user_id, module_id, title, target_date, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          countdownId,
          userId,
          input.moduleId,
          input.title,
          new Date(input.targetDate),
          input.category,
        ],
      )

      const [rows] = await db.execute<CountdownRow[]>(
        `SELECT id, module_id, title, target_date, category, created_at
           FROM academic_countdowns
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [countdownId, userId],
      )
      const countdown = rows[0]

      if (!countdown) throw new Error('Unable to load the created countdown.')

      response.status(201).json({ countdown: serializeCountdown(countdown) })
    } catch (error) {
      next(error)
    }
  },
)

router.put(
  '/countdowns/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = parseCreateCountdownInput(request.body)
      const countdownId = getCountdownId(request)
      const userId = getUserId(response)
      const [existingRows] = await db.execute<CountdownRow[]>(
        `SELECT id, module_id, title, target_date, category, created_at
           FROM academic_countdowns
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [countdownId, userId],
      )

      if (!existingRows[0]) {
        throw new AppError(404, 'Countdown not found.', 'COUNTDOWN_NOT_FOUND')
      }

      if (input.moduleId) {
        const [moduleRows] = await db.execute<RowDataPacket[]>(
          `SELECT m.id
             FROM modules AS m
             INNER JOIN semesters AS s ON s.id = m.semester_id
             INNER JOIN institutions AS i ON i.id = s.institution_id
            WHERE m.id = ? AND i.user_id = ?
            LIMIT 1`,
          [input.moduleId, userId],
        )

        if (!moduleRows[0]) {
          throw new AppError(404, 'Module not found.', 'MODULE_NOT_FOUND')
        }
      }

      await db.execute<ResultSetHeader>(
        `UPDATE academic_countdowns
            SET title = ?, target_date = ?, category = ?, module_id = ?
          WHERE id = ? AND user_id = ?`,
        [
          input.title,
          new Date(input.targetDate),
          input.category,
          input.moduleId,
          countdownId,
          userId,
        ],
      )

      const [rows] = await db.execute<CountdownRow[]>(
        `SELECT id, module_id, title, target_date, category, created_at
           FROM academic_countdowns
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [countdownId, userId],
      )
      const countdown = rows[0]

      if (!countdown) {
        throw new AppError(404, 'Countdown not found.', 'COUNTDOWN_NOT_FOUND')
      }

      response.status(200).json({ countdown: serializeCountdown(countdown) })
    } catch (error) {
      next(error)
    }
  },
)

router.delete(
  '/countdowns/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const [result] = await db.execute<ResultSetHeader>(
        `DELETE FROM academic_countdowns
          WHERE id = ? AND user_id = ?`,
        [getCountdownId(request), getUserId(response)],
      )

      if (result.affectedRows === 0) {
        throw new AppError(404, 'Countdown not found.', 'COUNTDOWN_NOT_FOUND')
      }

      response.status(200).json({ success: true })
    } catch (error) {
      next(error)
    }
  },
)

export default router
