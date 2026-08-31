import { useEffect, useMemo, useState } from 'react'

import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface ActivityDay {
  date: string
  minutes: number
}

interface HeatmapResponse {
  activity: ActivityDay[]
}

interface ActivityCalendarProps {
  refreshKey?: number
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

export function ActivityCalendar({ refreshKey = 0 }: ActivityCalendarProps) {
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<HeatmapResponse>('/api/study_sessions/heatmap', {
      signal: controller.signal,
    })
      .then(({ data }) => {
        setActivity(data.activity)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setError(formatApiError(requestError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  const totalMinutes = useMemo(
    () => activity.reduce((total, day) => total + day.minutes, 0),
    [activity],
  )
  const activeDays = useMemo(
    () => activity.filter((day) => day.minutes > 0).length,
    [activity],
  )

  return (
    <section
      className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-700/60"
      aria-labelledby="activity-calendar-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">focus/activity.last-30-days</span>
          <h2
            className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100"
            id="activity-calendar-title"
          >
            Study Activity
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Each filled square marks a day with completed focus time.
          </p>
        </div>
        {!isLoading && !error ? (
          <div className="text-right">
            <strong className="block font-mono text-lg text-blue-600 dark:text-blue-400">
              {totalMinutes} min
            </strong>
            <span className="text-[11px] text-slate-400">
              across {activeDays} active {activeDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-10 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
          {Array.from({ length: 30 }, (_, index) => (
            <div
              className="aspect-square animate-pulse rounded-md bg-slate-100 dark:bg-slate-700"
              key={index}
            />
          ))}
        </div>
      ) : error ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-10 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
            {activity.map((day) => {
              const label = `${formatDate(day.date)}: ${day.minutes} study ${day.minutes === 1 ? 'minute' : 'minutes'}`

              return (
                <div
                  className={`aspect-square rounded-md border transition-colors ${
                    day.minutes > 0
                      ? 'border-blue-500 bg-blue-500 shadow-sm shadow-blue-500/20 dark:border-blue-400 dark:bg-blue-400'
                      : 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70'
                  }`}
                  key={day.date}
                  role="img"
                  aria-label={label}
                  title={label}
                />
              )
            })}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
            <span>{activity[0] ? formatDate(activity[0].date) : ''}</span>
            <span>Today</span>
          </div>
        </>
      )}
    </section>
  )
}
