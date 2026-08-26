export interface HealthResponse {
  status: 'ok'
  service: string
  timestamp: string
}

export type GradeLetter =
  | 'AD'
  | 'Z'
  | 'DIST'
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'D+'
  | 'D'
  | 'D-'
  | 'E'
  | 'P'
  | 'NGP'
  | 'F'
  | 'S'
  | 'U'

export type ModuleStatus = 'backlog' | 'in-progress' | 'merged'

export interface Module {
  id: string
  moduleCode: string
  moduleName: string
  creditUnits: number
  targetGrade: GradeLetter
  actualGrade: GradeLetter | null
  status: ModuleStatus
  semester: string
}

export interface Institution {
  id: string
  name: string
}

export interface AcademicSemester {
  id: string
  institutionId: string
  academicYear: string
  term: string
}

export interface CreateModuleInput {
  moduleCode: string
  moduleName: string
  creditUnits: number
  targetGrade: GradeLetter
  actualGrade: GradeLetter | null
  status: ModuleStatus
}

export type GradeScale = Record<GradeLetter, number>

export type DevLinguaFlavor = 'positive' | 'negative' | 'casual'
