import { useEffect, useState } from 'react'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface BreakdownItem {
  label: string
  minutes: number
  sessionCount: number
}

interface BreakdownResponse {
  date: string
  breakdown: BreakdownItem[]
}

interface FocusBreakdownModalProps {
  date: string | null
  onClose: () => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatModalDate(dateStr: string): string {
  try {
    return dateFormatter.format(new Date(`${dateStr}T00:00:00Z`))
  } catch {
    return dateStr
  }
}

export function FocusBreakdownModal({ date, onClose }: FocusBreakdownModalProps) {
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    void apiRequest<BreakdownResponse>(`/api/study_sessions/breakdown?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        setBreakdown(data.breakdown || [])
      })
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          setError(formatApiError(err))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [date])

  if (!date) return null

  const totalDayMinutes = breakdown.reduce((sum, item) => sum + item.minutes, 0)
  const totalSessions = breakdown.reduce((sum, item) => sum + item.sessionCount, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
              focus/daily-breakdown
            </span>
            <h3 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              Focus Breakdown
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {formatModalDate(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-3 py-6">
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : breakdown.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">☕</div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No focus time recorded
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No completed sprints on this day.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Summary Banner */}
              <div className="flex items-center justify-between rounded-xl bg-blue-50/80 px-4 py-3 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏱️</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Focus Time
                  </span>
                </div>
                <div className="text-right">
                  <strong className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                    {totalDayMinutes} mins
                  </strong>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                    {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
              </div>

              {/* Grouped Category Breakdown */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {breakdown.map((item) => {
                  const percent = totalDayMinutes > 0 ? Math.round((item.minutes / totalDayMinutes) * 100) : 0

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                          <strong className="font-bold text-slate-900 dark:text-white">
                            {item.label}
                          </strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.minutes} mins
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({percent}%)
                          </span>
                        </div>
                      </div>

                      {/* Distribution bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
