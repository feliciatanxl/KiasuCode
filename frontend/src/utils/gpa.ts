import type { GradeLetter, Module } from '@kiasucode/shared'

export interface GradeScale {
  max: number
  points: Record<string, number>
}

export const GRADING_SCALES: Record<string, GradeScale> = {
  ITE: {
    max: 4.0,
    points: {
      DIST: 4.0,
      A: 4.0,
      B: 3.0,
      C: 2.0,
      D: 1.0,
      E: 1.0,
      NGP: 1.0,
      F: 0.0,
      S: 0.0,
    },
  },
  NYP: {
    max: 4.0,
    points: {
      DIST: 4.0,
      A: 4.0,
      'B+': 3.5,
      B: 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      P: 1.0,
      F: 0.0,
    },
  },
  NP: {
    max: 4.0,
    points: {
      AD: 4.0,
      'A+': 4.0,
      A: 4.0,
      'B+': 3.5,
      B: 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      F: 0.0,
    },
  },
  SP: {
    max: 4.0,
    points: {
      DIST: 4.0,
      A: 4.0,
      'B+': 3.5,
      B: 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      'D-': 0.5,
      P: 0.5,
      F: 0.0,
    },
  },
  TP: {
    max: 4.0,
    points: {
      Z: 4.0,
      A: 4.0,
      'B+': 3.5,
      B: 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      P: 1.0,
      F: 0.0,
    },
  },
  RP: {
    max: 4.0,
    points: {
      A: 4.0,
      'B+': 3.5,
      B: 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      F: 0.0,
    },
  },
  UNI: {
    max: 5.0,
    points: {
      'A+': 5.0,
      A: 5.0,
      'A-': 4.5,
      'B+': 4.0,
      B: 3.5,
      'B-': 3.0,
      'C+': 2.5,
      C: 2.0,
      'D+': 1.5,
      D: 1.0,
      F: 0.0,
      S: 0.0,
      U: 0.0,
    },
  },
  DEFAULT: {
    max: 4.0,
    points: {
      A: 4.0,
      B: 3.0,
      C: 2.0,
      D: 1.0,
      F: 0.0,
    },
  },
}

export const GRADE_THRESHOLDS: Record<string, number> = {
  DIST: 80,
  Z: 80,
  AD: 80,
  'A+': 80,
  A: 80,
  'B+': 75,
  B: 70,
  'C+': 65,
  C: 60,
  'D+': 55,
  D: 50,
  'D-': 45,
  F: 0,
}

export const SCHOOL_RESOLVER: Record<string, string> = {
  NYP: 'NYP',
  NP: 'NP',
  SP: 'SP',
  TP: 'TP',
  RP: 'RP',
  ITE: 'ITE',
  NTU: 'UNI',
  NUS: 'UNI',
  SIT: 'UNI',
  SUTD: 'UNI',
  SMU: 'UNI',
}

export const GRADE_OPTIONS: GradeLetter[] = [
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
]

export function getScaleForSchool(schoolName?: string): GradeScale {
  if (!schoolName) return GRADING_SCALES.DEFAULT
  const scaleKey = SCHOOL_RESOLVER[schoolName.toUpperCase()] || 'DEFAULT'
  return GRADING_SCALES[scaleKey] || GRADING_SCALES.DEFAULT
}

export function calculateCurrentGpa(
  modules: Module[],
  schoolName?: string,
): number {
  const completed = modules.filter(
    (module) => module.status === 'merged' && module.actualGrade,
  )

  return calculateWeightedGpa(
    completed.map((module) => ({
      grade: module.actualGrade as GradeLetter,
      creditUnits: module.creditUnits,
    })),
    schoolName,
  )
}

export function calculateTargetGpa(
  modules: Module[],
  schoolName?: string,
): number {
  return calculateWeightedGpa(
    modules.map((module) => ({
      grade: module.targetGrade,
      creditUnits: module.creditUnits,
    })),
    schoolName,
  )
}

export function calculateEarnedCredits(modules: Module[]): number {
  return modules
    .filter((module) => {
      if (module.status !== 'merged' || !module.actualGrade) return false
      const grade = module.actualGrade.trim().toUpperCase()
      return grade !== 'F' && grade !== 'U'
    })
    .reduce((sum, module) => sum + module.creditUnits, 0)
}

export function calculateWeightedGpa(
  entries: Array<{ grade: GradeLetter | string; creditUnits: number }>,
  schoolName?: string,
): number {
  const scale = getScaleForSchool(schoolName)

  let totalGpaCredits = 0
  let totalPoints = 0

  for (const entry of entries) {
    if (!entry.grade) continue

    const rawGrade = entry.grade.trim()
    const upperGrade = rawGrade.toUpperCase()

    // Grades explicitly excluded from GPA calculation (Pass / Exemption / Satisfactory non-GPA)
    if (
      upperGrade === 'P' ||
      upperGrade === 'CP' ||
      upperGrade === 'EX' ||
      upperGrade === 'S'
    ) {
      continue
    }

    const point =
      scale.points[rawGrade] ??
      scale.points[upperGrade] ??
      GRADING_SCALES.DEFAULT.points[rawGrade] ??
      GRADING_SCALES.DEFAULT.points[upperGrade]

    // If the grade point is undefined, null, or NaN, exclude from GPA denominator and numerator
    if (point === undefined || point === null || Number.isNaN(point)) {
      continue
    }

    totalGpaCredits += entry.creditUnits
    totalPoints += point * entry.creditUnits
  }

  if (totalGpaCredits === 0) return 0

  return totalPoints / totalGpaCredits
}

export function formatGpa(gpa: number): string {
  if (gpa === null || gpa === undefined || Number.isNaN(gpa) || !Number.isFinite(gpa)) {
    return '0.000'
  }
  return gpa.toFixed(3)
}
