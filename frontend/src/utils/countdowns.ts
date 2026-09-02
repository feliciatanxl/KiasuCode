import type { AcademicCountdown } from '@kiasucode/shared'

/**
 * If is_annual is true and the event's month/day has already passed in the current year,
 * dynamically calculate and return the target date string for the next calendar year so it loops automatically.
 */
export function getEffectiveTargetDate(targetDateStr: string, isAnnual?: boolean): string {
  if (!isAnnual) return targetDateStr
  const orig = new Date(targetDateStr)
  if (Number.isNaN(orig.getTime())) return targetDateStr

  const now = new Date()
  const currentYear = now.getFullYear()

  const candidate = new Date(orig)
  candidate.setFullYear(currentYear)

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const candidateStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate()).getTime()

  if (candidateStart < todayStart) {
    candidate.setFullYear(currentYear + 1)
  }

  return candidate.toISOString()
}

export function withEffectiveTargetDate(item: AcademicCountdown): AcademicCountdown {
  if (!item.isAnnual) return item
  const effective = getEffectiveTargetDate(item.targetDate, item.isAnnual)
  if (effective === item.targetDate) return item
  return {
    ...item,
    targetDate: effective,
  }
}
