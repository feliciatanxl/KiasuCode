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

export type CountdownCategory = string

export interface AcademicCountdown {
  id: string
  moduleId: string | null
  title: string
  targetDate: string
  category: CountdownCategory
  color?: string
  createdAt: string
}

export interface CreateCountdownInput {
  moduleId: string | null
  title: string
  targetDate: string
  category: CountdownCategory
  color?: string
}

export interface ModuleFile {
  id: string
  moduleId: string
  userId: string
  fileName: string
  fileUrl: string
  fileSizeKb: number
  createdAt: string
}

export type FriendshipStatus = 'Pending' | 'Accepted'

export interface FriendUser {
  id: string
  name: string
  email?: string | null
  photoUrl?: string | null
}

export interface FriendshipItem {
  id: string
  friend: FriendUser
  status: FriendshipStatus
  isRequester: boolean
  createdAt: string
}

export interface SendFriendRequestInput {
  target: string
}

export type RoomTimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface RoomParticipant {
  userId: string
  name: string
  photoUrl?: string | null
  joinedAt: string
}

export interface RoomState {
  roomId: string
  status: RoomTimerStatus
  durationSeconds: number
  remainingSeconds: number
  participants: RoomParticipant[]
  activeSince?: string | null
}

export interface TimerCompletePayload {
  roomId: string
  coinsEarned: number
  completedAt: string
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userPhotoUrl?: string | null
  message: string
  timestamp: string
}

export interface UserPresence {
  userId: string
  status: 'online' | 'offline'
  roomId: string | null
}


