import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcrypt'
import type {
  AcademicSemester,
  CreateModuleInput,
  GradeLetter,
  Institution,
  Module,
  ModuleStatus,
} from '@kiasucode/shared'
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

import { db } from '../config/db.js'
import { authenticateRequest } from '../middleware/authenticate.js'
import { getUserLivePresence } from '../sockets/studyRoom.js'

interface InstitutionRow extends RowDataPacket {
  id: string
  name: string
}

interface SemesterRow extends RowDataPacket {
  id: string
  institution_id: string
  academic_year: string
  term: string
}

interface ModuleRow extends RowDataPacket {
  id: string
  semester_id: string
  module_code: string
  module_name: string
  credits: number | string
  target_grade: GradeLetter
  actual_grade: GradeLetter | null
  status: 'Backlog' | 'In Progress' | 'Merged'
  academic_year: string
  term: string
}

interface PasswordHistoryRow extends RowDataPacket {
  password_hash: string
}

const gradeLetters = new Set<GradeLetter>([
  'AD',
  'Z',
  'DIST',
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'D+',
  'D',
  'D-',
  'E',
  'P',
  'NGP',
  'F',
  'S',
  'U',
])
const apiToDatabaseStatus: Record<ModuleStatus, ModuleRow['status']> = {
  backlog: 'Backlog',
  'in-progress': 'In Progress',
  merged: 'Merged',
}
const databaseToApiStatus: Record<ModuleRow['status'], ModuleStatus> = {
  Backlog: 'backlog',
  'In Progress': 'in-progress',
  Merged: 'merged',
}
const maxProfilePhotoUrlLength = 2_800_000
const supportedProfileImageDataUrl = /^data:image\/(?:gif|jpeg|png|webp);base64,/i

class InvalidAcademicRequestError extends Error {}

const router = Router()
const passwordReuseError = 'For security reasons, you cannot reuse your last 3 passwords.'
const academicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many API requests. Please try again later.' },
})

router.use(authenticateRequest, academicRateLimiter)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getUserId(response: Response): string {
  return response.locals.userId as string
}

function getRouteParam(request: Request, name: string): string {
  const value = request.params[name]

  if (typeof value !== 'string' || !value) {
    throw new InvalidAcademicRequestError(`Route parameter ${name} is required.`)
  }

  return value
}

function serializeInstitution(row: InstitutionRow): Institution {
  return { id: row.id, name: row.name }
}

function parseInstitutionName(body: unknown): string {
  if (!isRecord(body) || typeof body.name !== 'string') {
    throw new InvalidAcademicRequestError('Institution name is required.')
  }

  const name = body.name.trim()

  if (!name || name.length > 160) {
    throw new InvalidAcademicRequestError(
      'Institution name must be between 1 and 160 characters.',
    )
  }

  return name
}

function parseSemesterInput(body: unknown): {
  institutionId: string
  academicYear: string
  term: string
} {
  if (!isRecord(body)) {
    throw new InvalidAcademicRequestError('A JSON request body is required.')
  }

  const institutionIdValue = body.institution_id ?? body.institutionId
  const institutionId = typeof institutionIdValue === 'string'
    ? institutionIdValue.trim()
    : ''
  const academicYear = typeof body.academicYear === 'string'
    ? body.academicYear.trim().toUpperCase()
    : ''
  const term = typeof body.term === 'string' ? body.term.trim() : ''

  if (!institutionId) {
    throw new InvalidAcademicRequestError('Institution ID is required.')
  }

  if (!/^AY\d{2}\/\d{2}$/.test(academicYear)) {
    throw new InvalidAcademicRequestError(
      'Academic year must use the format AY24/25.',
    )
  }

  if (!term || term.length > 40) {
    throw new InvalidAcademicRequestError(
      'Term must be between 1 and 40 characters.',
    )
  }

  return { institutionId, academicYear, term }
}

function isDuplicateEntryError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ER_DUP_ENTRY'
}

function serializeSemester(row: SemesterRow): AcademicSemester {
  return {
    id: row.id,
    institutionId: row.institution_id,
    academicYear: row.academic_year,
    term: row.term,
  }
}

function serializeModule(row: ModuleRow): Module {
  return {
    id: row.id,
    moduleCode: row.module_code,
    moduleName: row.module_name,
    creditUnits: Number(row.credits),
    targetGrade: row.target_grade,
    actualGrade: row.actual_grade,
    status: databaseToApiStatus[row.status],
    semester: `${row.academic_year} · ${row.term}`,
  }
}

function parseCreateModuleInput(body: unknown): CreateModuleInput {
  if (!isRecord(body)) {
    throw new InvalidAcademicRequestError('A JSON request body is required.')
  }

  const moduleCode = typeof body.moduleCode === 'string'
    ? body.moduleCode.trim().toUpperCase()
    : ''
  const moduleName = typeof body.moduleName === 'string'
    ? body.moduleName.trim()
    : ''
  const creditUnits = Number(body.creditUnits)
  const targetGrade = body.targetGrade
  const actualGrade = body.actualGrade ?? null
  const status = body.status ?? 'backlog'

  if (!moduleCode || !moduleName) {
    throw new InvalidAcademicRequestError(
      'Module code and module name are required.',
    )
  }

  if (!Number.isFinite(creditUnits) || creditUnits <= 0 || creditUnits > 99.9) {
    throw new InvalidAcademicRequestError('Credits must be between 0 and 99.9.')
  }

  if (!gradeLetters.has(targetGrade as GradeLetter)) {
    throw new InvalidAcademicRequestError('Target grade is invalid.')
  }

  if (actualGrade !== null && !gradeLetters.has(actualGrade as GradeLetter)) {
    throw new InvalidAcademicRequestError('Actual grade is invalid.')
  }

  if (!(typeof status === 'string' && status in apiToDatabaseStatus)) {
    throw new InvalidAcademicRequestError('Module status is invalid.')
  }

  return {
    moduleCode,
    moduleName,
    creditUnits,
    targetGrade: targetGrade as GradeLetter,
    actualGrade: actualGrade as GradeLetter | null,
    status: status as ModuleStatus,
  }
}

async function createOwnedModule(
  semesterId: string,
  userId: string,
  input: CreateModuleInput,
): Promise<ModuleRow | null> {
  const [semesterRows] = await db.execute<RowDataPacket[]>(
    `SELECT s.id
       FROM semesters AS s
       INNER JOIN institutions AS i ON i.id = s.institution_id
      WHERE s.id = ? AND i.user_id = ?
      LIMIT 1`,
    [semesterId, userId],
  )

  if (!semesterRows[0]) return null

  const moduleId = uuidv4()

  await db.execute<ResultSetHeader>(
    `INSERT INTO modules
      (id, semester_id, module_code, module_name, credits, target_grade,
       actual_grade, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      moduleId,
      semesterId,
      input.moduleCode,
      input.moduleName,
      input.creditUnits,
      input.targetGrade,
      input.actualGrade,
      apiToDatabaseStatus[input.status],
    ],
  )

  return (await findOwnedModule(moduleId, userId)) ?? null
}

async function findOwnedModule(
  moduleId: string,
  userId: string,
): Promise<ModuleRow | undefined> {
  const [rows] = await db.execute<ModuleRow[]>(
    `SELECT m.*, s.academic_year, s.term
       FROM modules AS m
       INNER JOIN semesters AS s ON s.id = m.semester_id
       INNER JOIN institutions AS i ON i.id = s.institution_id
      WHERE m.id = ? AND i.user_id = ?
      LIMIT 1`,
    [moduleId, userId],
  )

  return rows[0]
}

router.get('/institutions', async (_request: Request, response: Response) => {
  try {
    const [rows] = await db.execute<InstitutionRow[]>(
      `SELECT id, name
         FROM institutions
        WHERE user_id = ?
        ORDER BY name ASC`,
      [getUserId(response)],
    )

    response.status(200).json({ institutions: rows.map(serializeInstitution) })
  } catch (error) {
    console.error('Unable to load institutions: %o', error)
    response.status(500).json({ error: 'Unable to load institutions.' })
  }
})

router.post('/institutions', async (request: Request, response: Response) => {
  try {
    const name = parseInstitutionName(request.body)
    const institution: Institution = { id: uuidv4(), name }

    await db.execute<ResultSetHeader>(
      `INSERT INTO institutions (id, user_id, name)
       VALUES (?, ?, ?)`,
      [institution.id, getUserId(response), institution.name],
    )

    response.status(200).json({ institution })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    if (isDuplicateEntryError(error)) {
      response.status(409).json({ error: 'That institution already exists.' })
      return
    }

    console.error('Unable to create institution: %o', error)
    response.status(500).json({ error: 'Unable to create institution.' })
  }
})

router.delete('/institutions/:id', async (request: Request, response: Response) => {
  try {
    const institutionId = getRouteParam(request, 'id')
    const [result] = await db.execute<ResultSetHeader>(
      `DELETE FROM institutions WHERE id = ? AND user_id = ?`,
      [institutionId, getUserId(response)],
    )

    if (result.affectedRows === 0) {
      response.status(404).json({ error: 'Institution not found.' })
      return
    }

    response.status(200).json({ success: true })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to delete institution: %o', error)
    response.status(500).json({ error: 'Unable to delete institution.' })
  }
})

router.post('/semesters', async (request: Request, response: Response) => {
  try {
    const input = parseSemesterInput(request.body)
    const [institutionRows] = await db.execute<RowDataPacket[]>(
      `SELECT id
         FROM institutions
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [input.institutionId, getUserId(response)],
    )

    if (!institutionRows[0]) {
      response.status(404).json({ error: 'Institution not found.' })
      return
    }

    const semester: AcademicSemester = {
      id: uuidv4(),
      institutionId: input.institutionId,
      academicYear: input.academicYear,
      term: input.term,
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO semesters
        (id, institution_id, academic_year, term)
       VALUES (?, ?, ?, ?)`,
      [
        semester.id,
        semester.institutionId,
        semester.academicYear,
        semester.term,
      ],
    )

    response.status(200).json({ semester })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    if (isDuplicateEntryError(error)) {
      response.status(409).json({ error: 'That semester already exists.' })
      return
    }

    console.error('Unable to create semester: %o', error)
    response.status(500).json({ error: 'Unable to create semester.' })
  }
})

router.post('/modules', async (request: Request, response: Response) => {
  try {
    if (!isRecord(request.body)) {
      throw new InvalidAcademicRequestError('A JSON request body is required.')
    }

    const semesterIdValue = request.body.semester_id ?? request.body.semesterId
    const semesterId = typeof semesterIdValue === 'string'
      ? semesterIdValue.trim()
      : ''

    if (!semesterId) {
      throw new InvalidAcademicRequestError('Semester ID is required.')
    }

    const input = parseCreateModuleInput(request.body)
    const module = await createOwnedModule(
      semesterId,
      getUserId(response),
      input,
    )

    if (!module) {
      response.status(404).json({ error: 'Semester not found.' })
      return
    }

    response.status(200).json({ module: serializeModule(module) })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    if (isDuplicateEntryError(error)) {
      response.status(409).json({ error: 'That module already exists.' })
      return
    }

    console.error('Unable to create module: %o', error)
    response.status(500).json({ error: 'Unable to create module.' })
  }
})

router.get(
  '/institutions/:institutionId/semesters',
  async (request: Request, response: Response) => {
    try {
      const institutionId = getRouteParam(request, 'institutionId')
      const [rows] = await db.execute<SemesterRow[]>(
        `SELECT s.id, s.institution_id, s.academic_year, s.term
           FROM semesters AS s
           INNER JOIN institutions AS i ON i.id = s.institution_id
          WHERE s.institution_id = ? AND i.user_id = ?
          ORDER BY s.academic_year DESC, s.term DESC`,
        [institutionId, getUserId(response)],
      )

      response.status(200).json({ semesters: rows.map(serializeSemester) })
    } catch (error) {
      console.error('Unable to load semesters: %o', error)
      response.status(500).json({ error: 'Unable to load semesters.' })
    }
  },
)

router.get('/modules', async (_request: Request, response: Response) => {
  try {
    const [rows] = await db.execute<ModuleRow[]>(
      `SELECT m.*, s.academic_year, s.term
         FROM modules AS m
         INNER JOIN semesters AS s ON s.id = m.semester_id
         INNER JOIN institutions AS i ON i.id = s.institution_id
        WHERE i.user_id = ?
        ORDER BY m.module_code ASC`,
      [getUserId(response)],
    )

    response.status(200).json({ modules: rows.map(serializeModule) })
  } catch (error) {
    console.error('Unable to load user modules: %o', error)
    response.status(500).json({ error: 'Unable to load user modules.' })
  }
})

router.get(
  '/institutions/:institutionId/modules',
  async (request: Request, response: Response) => {
    try {
      const institutionId = getRouteParam(request, 'institutionId')
      const [rows] = await db.execute<ModuleRow[]>(
        `SELECT m.*, s.academic_year, s.term
           FROM modules AS m
           INNER JOIN semesters AS s ON s.id = m.semester_id
           INNER JOIN institutions AS i ON i.id = s.institution_id
          WHERE i.id = ? AND i.user_id = ?
          ORDER BY s.academic_year DESC, s.term DESC, m.module_code ASC`,
        [institutionId, getUserId(response)],
      )

      response.status(200).json({ modules: rows.map(serializeModule) })
    } catch (error) {
      console.error('Unable to load institution modules: %o', error)
      response.status(500).json({ error: 'Unable to load institution modules.' })
    }
  },
)

router.get(
  '/semesters/:semesterId/modules',
  async (request: Request, response: Response) => {
    try {
      const semesterId = getRouteParam(request, 'semesterId')
      const [rows] = await db.execute<ModuleRow[]>(
        `SELECT m.*, s.academic_year, s.term
           FROM modules AS m
           INNER JOIN semesters AS s ON s.id = m.semester_id
           INNER JOIN institutions AS i ON i.id = s.institution_id
          WHERE m.semester_id = ? AND i.user_id = ?
          ORDER BY m.module_code ASC`,
        [semesterId, getUserId(response)],
      )

      response.status(200).json({ modules: rows.map(serializeModule) })
    } catch (error) {
      console.error('Unable to load modules: %o', error)
      response.status(500).json({ error: 'Unable to load modules.' })
    }
  },
)

router.post(
  '/semesters/:semesterId/modules',
  async (request: Request, response: Response) => {
    try {
      const input = parseCreateModuleInput(request.body)
      const semesterId = getRouteParam(request, 'semesterId')
      const module = await createOwnedModule(
        semesterId,
        getUserId(response),
        input,
      )

      if (!module) {
        response.status(404).json({ error: 'Semester not found.' })
        return
      }

      response.status(201).json({ module: serializeModule(module) })
    } catch (error) {
      if (error instanceof InvalidAcademicRequestError) {
        response.status(400).json({ error: error.message })
        return
      }

      console.error('Unable to create module: %o', error)
      response.status(500).json({ error: 'Unable to create module.' })
    }
  },
)

router.patch('/modules/:moduleId', async (request: Request, response: Response) => {
  try {
    if (!isRecord(request.body)) {
      throw new InvalidAcademicRequestError('A JSON request body is required.')
    }

    const updates: string[] = []
    const values: Array<number | string | null> = []
    const body = request.body
    const moduleId = getRouteParam(request, 'moduleId')

    if ('creditUnits' in body) {
      const creditUnits = Number(body.creditUnits)
      if (!Number.isFinite(creditUnits) || creditUnits <= 0 || creditUnits > 99.9) {
        throw new InvalidAcademicRequestError('Credits must be between 0 and 99.9.')
      }
      updates.push('m.credits = ?')
      values.push(creditUnits)
    }

    if ('targetGrade' in body) {
      if (!gradeLetters.has(body.targetGrade as GradeLetter)) {
        throw new InvalidAcademicRequestError('Target grade is invalid.')
      }
      updates.push('m.target_grade = ?')
      values.push(body.targetGrade as string)
    }

    if ('actualGrade' in body) {
      if (body.actualGrade !== null && !gradeLetters.has(body.actualGrade as GradeLetter)) {
        throw new InvalidAcademicRequestError('Actual grade is invalid.')
      }
      updates.push('m.actual_grade = ?')
      values.push(body.actualGrade as string | null)
    }

    if ('status' in body) {
      if (!(typeof body.status === 'string' && body.status in apiToDatabaseStatus)) {
        throw new InvalidAcademicRequestError('Module status is invalid.')
      }
      updates.push('m.status = ?')
      values.push(apiToDatabaseStatus[body.status as ModuleStatus]!)
    }

    if (updates.length === 0) {
      throw new InvalidAcademicRequestError('No supported module fields supplied.')
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE modules AS m
       INNER JOIN semesters AS s ON s.id = m.semester_id
       INNER JOIN institutions AS i ON i.id = s.institution_id
          SET ${updates.join(', ')}
        WHERE m.id = ? AND i.user_id = ?`,
      [...values, moduleId, getUserId(response)],
    )

    if (result.affectedRows === 0) {
      response.status(404).json({ error: 'Module not found.' })
      return
    }

    const module = await findOwnedModule(
      moduleId,
      getUserId(response),
    )

    if (!module) {
      throw new Error('Updated module could not be loaded.')
    }

    response.status(200).json({ module: serializeModule(module) })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to update module: %o', error)
    response.status(500).json({ error: 'Unable to update module.' })
  }
})

router.delete('/modules/:moduleId', async (request: Request, response: Response) => {
  try {
    const moduleId = getRouteParam(request, 'moduleId')
    const [result] = await db.execute<ResultSetHeader>(
      `DELETE m
         FROM modules AS m
         INNER JOIN semesters AS s ON s.id = m.semester_id
         INNER JOIN institutions AS i ON i.id = s.institution_id
        WHERE m.id = ? AND i.user_id = ?`,
      [moduleId, getUserId(response)],
    )

    if (result.affectedRows === 0) {
      response.status(404).json({ error: 'Module not found.' })
      return
    }

    response.status(200).json({ success: true })
  } catch (error) {
    console.error('Unable to delete module: %o', error)
    response.status(500).json({ error: 'Unable to delete module.' })
  }
})

const handleUpdateUserProfile = async (request: Request, response: Response) => {
  try {
    const userId = getUserId(response)
    if (!isRecord(request.body)) {
      throw new InvalidAcademicRequestError('A JSON request body is required.')
    }

    const { name, username, photo_url, photoUrl } = request.body
    const rawUsername = username ?? name
    const newName = typeof rawUsername === 'string' ? rawUsername.trim() : ''
    const rawPhotoUrl = photo_url ?? photoUrl
    const newPhotoUrl = typeof rawPhotoUrl === 'string'
      ? rawPhotoUrl.trim()
      : null

    if (!newName) {
      throw new InvalidAcademicRequestError('A valid username is required.')
    }

    if (newPhotoUrl && newPhotoUrl.length > maxProfilePhotoUrlLength) {
      throw new InvalidAcademicRequestError('Profile pictures must be 2 MB or smaller.')
    }

    if (
      newPhotoUrl &&
      !supportedProfileImageDataUrl.test(newPhotoUrl) &&
      !/^https?:\/\//i.test(newPhotoUrl)
    ) {
      throw new InvalidAcademicRequestError('Invalid profile picture format.')
    }

    // Check if username is already taken by another user
    const [existingUsernames] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
      [newName, userId],
    )

    if (existingUsernames.length > 0) {
      response.status(400).json({ error: 'Username is already taken. Please choose another.' })
      return
    }

    await db.execute<ResultSetHeader>(
      'UPDATE users SET name = ?, photo_url = ? WHERE id = ?',
      [newName, newPhotoUrl, userId],
    )

    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, provider, name, email, photo_url FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const userRow = rows[0]

    if (!userRow) {
      response.status(404).json({ error: 'User not found.' })
      return
    }

    response.status(200).json({
      success: true,
      user: {
        id: userRow.id,
        provider: userRow.provider,
        name: userRow.name,
        ...(userRow.email ? { email: userRow.email } : {}),
        ...(userRow.photo_url ? { photoUrl: userRow.photo_url } : {}),
      },
    })
  } catch (error) {
    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to update user profile: %o', error)
    response.status(500).json({ error: 'Unable to update user profile.' })
  }
}

router.put('/user/profile', handleUpdateUserProfile)
router.put('/profile', handleUpdateUserProfile)

router.get('/user/presence', authenticateRequest, (_request: Request, response: Response) => {
  try {
    const userId = getUserId(response)
    const presence = getUserLivePresence(userId)
    response.status(200).json(presence)
  } catch (error) {
    console.error('Unable to get user presence: %o', error)
    response.status(500).json({ error: 'Unable to get user presence.' })
  }
})

router.post('/auth/set-password', async (request: Request, response: Response) => {
  let connection: PoolConnection | undefined

  try {
    const userId = getUserId(response)
    if (!isRecord(request.body)) {
      throw new InvalidAcademicRequestError('A JSON request body is required.')
    }

    const passwordValue = request.body.password ?? request.body.newPassword
    if (typeof passwordValue !== 'string' || passwordValue.length < 6) {
      throw new InvalidAcademicRequestError('Password must be at least 6 characters long.')
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    const [userRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [userId],
    )

    if (!userRows[0]) {
      await connection.rollback()
      response.status(404).json({ error: 'User not found.' })
      return
    }

    const [recentPasswordRows] = await connection.execute<PasswordHistoryRow[]>(
      `SELECT password_hash
         FROM password_history
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 3`,
      [userId],
    )
    const recentPasswordMatches = await Promise.all(
      recentPasswordRows.map((row) =>
        bcrypt.compare(passwordValue, row.password_hash),
      ),
    )

    if (recentPasswordMatches.some(Boolean)) {
      await connection.rollback()
      response.status(400).json({ error: passwordReuseError })
      return
    }

    const passwordHash = await bcrypt.hash(passwordValue, 10)

    await connection.execute<ResultSetHeader>(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId],
    )
    await connection.execute<ResultSetHeader>(
      `INSERT INTO password_history (id, user_id, password_hash)
       VALUES (?, ?, ?)`,
      [uuidv4(), userId, passwordHash],
    )

    await connection.commit()

    response.status(200).json({ success: true, message: 'Password configured successfully.' })
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined)

    if (error instanceof InvalidAcademicRequestError) {
      response.status(400).json({ error: error.message })
      return
    }

    console.error('Unable to set user password: %o', error)
    response.status(500).json({ error: 'Unable to set password.' })
  } finally {
    connection?.release()
  }
})

export default router
