import { useEffect, useMemo, useState } from 'react'
import type { AcademicCountdown } from '@kiasucode/shared'

import { defaultCountdownColor, resolveCountdownColor } from '../utils/colors'

interface CountdownCardProps {
  countdown: AcademicCountdown
  isDeleting?: boolean
  onDelete: (id: string) => Promise<void>
  onEdit?: (countdown: AcademicCountdown) => void
}

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function CountdownCard({
  countdown,
  isDeleting = false,
  onDelete,
  onEdit,
}: CountdownCardProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const timing = useMemo(() => {
    const targetTime = new Date(countdown.targetDate).getTime()
    const createdTime = new Date(countdown.createdAt).getTime()
    const remainingMs = targetTime - now
    const absoluteRemainingMs = Math.abs(remainingMs)
    const days = Math.floor(absoluteRemainingMs / dayMs)
    const hours = Math.floor((absoluteRemainingMs % dayMs) / hourMs)
    const totalDuration = Math.max(1, targetTime - createdTime)
    const remainingPercent = clamp((remainingMs / totalDuration) * 100)

    return {
      days,
      hours,
      isExpired: remainingMs <= 0,
      isDueSoon: remainingMs > 0 && remainingMs <= dayMs,
      remainingPercent,
    }
  }, [countdown.createdAt, countdown.targetDate, now])
  const ringRadius = 25
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - timing.remainingPercent / 100)
  const categoryColor = resolveCountdownColor(countdown.color || defaultCountdownColor)

  return (
    <article className="min-w-[280px] snap-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:min-w-[320px]">
      <div className="flex items-start justify-between gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
          style={{ backgroundColor: categoryColor }}
        >
          {countdown.category}
        </span>
        <div className="flex items-center gap-1">
          {onEdit ? (
            <button
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              type="button"
              onClick={() => onEdit(countdown)}
              disabled={isDeleting}
              aria-label={`Edit ${countdown.title}`}
              title="Edit countdown"
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m13.8 3.8 2.4 2.4M4 16l3.1-.6 8.6-8.6a1.7 1.7 0 0 0 0-2.5 1.7 1.7 0 0 0-2.5 0l-8.6 8.6L4 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <button
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            type="button"
            onClick={() => void onDelete(countdown.id)}
            disabled={isDeleting}
            aria-label={`Delete ${countdown.title}`}
            title="Delete countdown"
          >
            {isDeleting ? '…' : '×'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          <svg className="size-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-700" />
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              className={timing.isExpired ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-xs font-black text-slate-700 dark:text-slate-200">
            {timing.isExpired ? '0%' : `${Math.round(timing.remainingPercent)}%`}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900 dark:text-white" title={countdown.title}>
            {countdown.title}
          </h3>
          <p className={`mt-1 font-mono text-xl font-black ${timing.isExpired ? 'text-red-600 dark:text-red-300' : 'text-slate-900 dark:text-slate-100'}`}>
            {timing.days}d {timing.hours}h
          </p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            timing.isExpired
              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
              : timing.isDueSoon
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {timing.isExpired ? 'Past due' : timing.isDueSoon ? 'Due soon' : 'Upcoming'}
          </span>
        </div>
      </div>

      <time
        className="mt-5 block border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
        dateTime={countdown.targetDate}
      >
        {new Date(countdown.targetDate).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </time>
    </article>
  )
}
