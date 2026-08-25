export interface HealthResponse {
  status: 'ok'
  service: string
  timestamp: string
}

export type GradeLetter =
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'D+'
  | 'D'
  | 'F'

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

export type GradeScale = Record<GradeLetter, number>

export type DevLinguaFlavor = 'positive' | 'negative' | 'casual'
