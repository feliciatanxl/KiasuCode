import fs from 'node:fs'
import path from 'node:path'
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import type { ModuleFile } from '@kiasucode/shared'
import multer from 'multer'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { AppError } from '../middleware/errorHandler.js'

interface FileRow extends RowDataPacket {
  id: string
  module_id: string
  user_id: string
  file_name: string
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  created_at: Date | string
}

const router = Router()
const uploadsDirectory = path.resolve(process.env.UPLOAD_DIR || '/app/uploads')

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true })
}

function getSafeUploadFilePath(filePath: string): string {
  const baseName = path.basename(filePath)
  const normalizedUploadDir = path.resolve(uploadsDirectory)
  const resolvedPath = path.resolve(normalizedUploadDir, baseName)
  if (!baseName || !resolvedPath.startsWith(normalizedUploadDir + path.sep)) {
    throw new AppError(400, 'Invalid file path.', 'INVALID_FILE_PATH')
  }
  return resolvedPath
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadsDirectory)
  },
  filename(_req, file, callback) {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
    const uniqueSuffix = `${Date.now()}-${uuidv4().slice(0, 8)}`
    const safeFilename = path.basename(`${base}-${uniqueSuffix}${ext}`)
    callback(null, safeFilename)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
})

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

function serializeFile(row: FileRow): ModuleFile {
  return {
    id: row.id,
    moduleId: row.module_id,
    userId: row.user_id,
    fileName: row.file_name,
    fileUrl: `/files/${row.id}/download`,
    fileSizeKb: Math.max(1, Math.round((row.file_size ?? 0) / 1024)),
    createdAt: toIsoString(row.created_at),
  }
}

async function validateModuleOwnership(moduleId: string, userId: string): Promise<void> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT m.id
       FROM modules AS m
       INNER JOIN semesters AS s ON s.id = m.semester_id
       INNER JOIN institutions AS i ON i.id = s.institution_id
      WHERE m.id = ? AND i.user_id = ?
      LIMIT 1`,
    [moduleId, userId],
  )

  if (!rows[0]) {
    throw new AppError(404, 'Module not found or access denied.', 'MODULE_NOT_FOUND')
  }
}

router.get(
  '/modules/:moduleId/files',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const moduleId = getParam(request, 'moduleId')
      const userId = getUserId(response)
      await validateModuleOwnership(moduleId, userId)

      const [rows] = await db.execute<FileRow[]>(
        `SELECT id, module_id, user_id, file_name, file_path, file_size, mime_type, created_at
           FROM module_files
          WHERE module_id = ? AND user_id = ?
          ORDER BY created_at DESC`,
        [moduleId, userId],
      )

      response.status(200).json({ files: rows.map(serializeFile) })
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/modules/:moduleId/files',
  authenticateRequest,
  upload.single('file'),
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const moduleId = getParam(request, 'moduleId')
      const userId = getUserId(response)
      await validateModuleOwnership(moduleId, userId)


      const file = request.file
      if (!file) {
        throw new AppError(400, 'A file attachment is required.', 'FILE_REQUIRED')
      }

      const fileId = uuidv4()
      const filePath = getSafeUploadFilePath(file.path)

      await db.execute<ResultSetHeader>(
        `INSERT INTO module_files
          (id, module_id, user_id, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          moduleId,
          userId,
          file.originalname.slice(0, 255),
          filePath,
          file.size,
          file.mimetype,
        ],
      )

      const [rows] = await db.execute<FileRow[]>(
        `SELECT id, module_id, user_id, file_name, file_path, file_size, mime_type, created_at
           FROM module_files
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [fileId, userId],
      )

      const createdFile = rows[0]
      if (!createdFile) {
        throw new Error('Unable to retrieve uploaded file record.')
      }

      response.status(201).json({ file: serializeFile(createdFile) })
    } catch (error) {
      if (request.file) {
        const safeCleanupPath = getSafeUploadFilePath(request.file.filename)
        fs.promises.unlink(safeCleanupPath).catch(() => undefined)
      }
      next(error)
    }
  },
)

async function handleDeleteFile(fileId: string, userId: string, response: Response, next: NextFunction) {
  try {
    const [rows] = await db.execute<FileRow[]>(
      `SELECT id, module_id, user_id, file_name, file_path, file_size, mime_type, created_at
         FROM module_files
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [fileId, userId],
    )

    const fileRow = rows[0]
    if (!fileRow) {
      throw new AppError(404, 'File not found or access denied.', 'FILE_NOT_FOUND')
    }

    await db.execute<ResultSetHeader>(
      `DELETE FROM module_files WHERE id = ? AND user_id = ?`,
      [fileId, userId],
    )

    if (fileRow.file_path) {
      const diskPath = getSafeUploadFilePath(fileRow.file_path)
      await fs.promises.unlink(diskPath).catch(() => undefined)
    }

    response.status(200).json({ success: true })
  } catch (error) {
    next(error)
  }
}

router.get(
  '/files/:id/download',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const fileId = getParam(request, 'id')
      const userId = getUserId(response)

      const [rows] = await db.execute<FileRow[]>(
        `SELECT id, module_id, user_id, file_name, file_path, file_size, mime_type, created_at
           FROM module_files
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
        [fileId, userId],
      )

      const fileRow = rows[0]
      if (!fileRow) {
        throw new AppError(404, 'File not found or access denied.', 'FILE_NOT_FOUND')
      }

      if (!fileRow.file_path) {
        throw new AppError(404, 'File not found on disk.', 'FILE_NOT_FOUND')
      }

      const filePath = getSafeUploadFilePath(fileRow.file_path)
      if (!fs.existsSync(filePath)) {
        throw new AppError(404, 'File not found on disk.', 'FILE_NOT_FOUND')
      }

      const originalName = path.basename(fileRow.file_name)
      response.download(filePath, originalName)
    } catch (error) {
      next(error)
    }
  },
)

router.delete(
  '/files/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const fileId = getParam(request, 'id')
      await handleDeleteFile(fileId, getUserId(response), response, next)
    } catch (error) {
      next(error)
    }
  },
)

router.delete(
  '/modules/:moduleId/files/:id',
  authenticateRequest,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const fileId = getParam(request, 'id')
      await handleDeleteFile(fileId, getUserId(response), response, next)
    } catch (error) {
      next(error)
    }
  },
)

export default router
