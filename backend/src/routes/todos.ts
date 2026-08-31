import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import type { TodoItem } from '@kiasucode/shared'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'

interface TodoRow extends RowDataPacket {
  id: string
  user_id: string
  title: string
  label: string | null
  description: string | null
  deadline: Date | string | null
  is_completed: number | boolean
  created_at: Date | string
}

const router = Router()

// Auto-ensure table exists on startup
async function ensureTodosTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id CHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        label VARCHAR(100) NULL,
        description TEXT NULL,
        deadline DATETIME NULL,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_todos_user (user_id),
        KEY idx_todos_user_completed (user_id, is_completed)
      ) ENGINE = InnoDB
        DEFAULT CHARACTER SET = utf8mb4
        COLLATE = utf8mb4_0900_ai_ci;
    `)
  } catch (err) {
    console.error('[Todos] Failed to ensure todos table:', err)
  }
}
void ensureTodosTable()

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function serializeTodo(row: TodoRow): TodoItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    label: row.label,
    description: row.description,
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    isCompleted: Boolean(row.is_completed),
    ...(row.created_at ? { createdAt: new Date(row.created_at).toISOString() } : {}),
  }
}

// GET /api/todos - List all todos for current user
router.get(
  '/todos',
  authenticateRequest,
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = getUserId(response)
      const [rows] = await db.execute<TodoRow[]>(
        `SELECT id, user_id, title, label, description, deadline, is_completed, created_at
           FROM todos
          WHERE user_id = ?
          ORDER BY is_completed ASC, created_at DESC`,
        [userId],
      )

      response.status(200).json({ todos: rows.map(serializeTodo) })
    } catch (error) {
      next(error)
    }
  },
)

// POST /api/todos - Create new todo
router.post(
  '/todos',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = getUserId(response)
      const { title, label, description, deadline, isCompleted } = request.body as {
        title?: string
        label?: string | null
        description?: string | null
        deadline?: string | null
        isCompleted?: boolean
      }

      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new AppError(400, 'Title is required.', 'INVALID_TITLE')
      }

      const id = uuidv4()
      const deadlineDate = deadline ? new Date(deadline) : null
      const completed = Boolean(isCompleted)

      await db.execute<ResultSetHeader>(
        `INSERT INTO todos (id, user_id, title, label, description, deadline, is_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          title.trim(),
          label?.trim() || null,
          description?.trim() || null,
          deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate : null,
          completed ? 1 : 0,
        ],
      )

      const [rows] = await db.execute<TodoRow[]>(
        `SELECT id, user_id, title, label, description, deadline, is_completed, created_at
           FROM todos
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [id, userId],
      )

      const created = rows[0]
      if (!created) throw new Error('Failed to retrieve created todo.')

      response.status(201).json({ todo: serializeTodo(created) })
    } catch (error) {
      next(error)
    }
  },
)

// PATCH /api/todos/:id - Update todo (e.g. toggle completion or edit text)
router.patch(
  '/todos/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = getUserId(response)
      const id = String(request.params.id || '').trim()
      if (!id) throw new AppError(400, 'ID is required.', 'INVALID_ID')

      const { title, label, description, deadline, isCompleted } = request.body as {
        title?: string
        label?: string | null
        description?: string | null
        deadline?: string | null
        isCompleted?: boolean
      }

      const [existing] = await db.execute<TodoRow[]>(
        `SELECT id, user_id, title, label, description, deadline, is_completed, created_at
           FROM todos
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [id, userId],
      )

      if (!existing[0]) {
        throw new AppError(404, 'To-do item not found.', 'TODO_NOT_FOUND')
      }

      const current = existing[0]
      const updatedTitle = typeof title === 'string' ? title.trim() : current.title
      const updatedLabel = label !== undefined ? (label?.trim() || null) : current.label
      const updatedDescription = description !== undefined ? (description?.trim() || null) : current.description
      let updatedDeadline = current.deadline
      if (deadline !== undefined) {
        if (!deadline) {
          updatedDeadline = null
        } else {
          const parsed = new Date(deadline)
          if (!Number.isNaN(parsed.getTime())) updatedDeadline = parsed
        }
      }
      const updatedCompleted = isCompleted !== undefined ? Boolean(isCompleted) : Boolean(current.is_completed)

      await db.execute<ResultSetHeader>(
        `UPDATE todos
            SET title = ?, label = ?, description = ?, deadline = ?, is_completed = ?
          WHERE id = ? AND user_id = ?`,
        [
          updatedTitle,
          updatedLabel,
          updatedDescription,
          updatedDeadline,
          updatedCompleted ? 1 : 0,
          id,
          userId,
        ],
      )

      const [rows] = await db.execute<TodoRow[]>(
        `SELECT id, user_id, title, label, description, deadline, is_completed, created_at
           FROM todos
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [id, userId],
      )

      response.status(200).json({ todo: serializeTodo(rows[0]!) })
    } catch (error) {
      next(error)
    }
  },
)

// DELETE /api/todos/:id - Delete a todo
router.delete(
  '/todos/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = getUserId(response)
      const id = String(request.params.id || '').trim()
      if (!id) throw new AppError(400, 'ID is required.', 'INVALID_ID')

      const [result] = await db.execute<ResultSetHeader>(
        `DELETE FROM todos WHERE id = ? AND user_id = ?`,
        [id, userId],
      )

      if (result.affectedRows === 0) {
        throw new AppError(404, 'To-do item not found.', 'TODO_NOT_FOUND')
      }

      response.status(200).json({ success: true, message: 'To-do deleted successfully.' })
    } catch (error) {
      next(error)
    }
  },
)

export default router
