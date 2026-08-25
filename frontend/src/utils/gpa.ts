import type { GradeLetter, GradeScale, Module } from '@kiasucode/shared'

export const GRADE_SCALE: GradeScale = {
  A: 4,
  'A-': 3.7,
  'B+': 3.5,
  B: 3,
  'B-': 2.7,
  'C+': 2.5,
  C: 2,
  'D+': 1.5,
  D: 1,
  F: 0,
}

export const GRADE_OPTIONS = Object.keys(GRADE_SCALE) as GradeLetter[]

export function calculateCurrentGpa(modules: Module[]): number {
  const completed = modules.filter(
    (module) => module.status === 'merged' && module.actualGrade,
  )

  return calculateWeightedGpa(
    completed.map((module) => ({
      grade: module.actualGrade as GradeLetter,
      creditUnits: module.creditUnits,
    })),
  )
}

export function calculateTargetGpa(modules: Module[]): number {
  return calculateWeightedGpa(
    modules.map((module) => ({
      grade: module.targetGrade,
      creditUnits: module.creditUnits,
    })),
  )
}

export function calculateEarnedCredits(modules: Module[]): number {
  return modules
    .filter((module) => module.status === 'merged' && module.actualGrade)
    .reduce((sum, module) => sum + module.creditUnits, 0)
}

export function calculateWeightedGpa(
  entries: Array<{ grade: GradeLetter; creditUnits: number }>,
): number {
  const totalCredits = entries.reduce(
    (sum, entry) => sum + entry.creditUnits,
    0,
  )

  if (totalCredits === 0) return 0

  const totalPoints = entries.reduce(
    (sum, entry) => sum + GRADE_SCALE[entry.grade] * entry.creditUnits,
    0,
  )

  return totalPoints / totalCredits
}

export function formatGpa(gpa: number): string {
  return gpa.toFixed(2)
}
