import { useEffect, useMemo, useState } from 'react'
import type { AcademicCountdown } from '@kiasucode/shared'

import { CountdownSection } from '../components/CountdownSection'
import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { apiRequest, isAbortError } from '../utils/api'
import { getCategoryColor } from '../utils/colors'

interface CountdownsResponse {
  countdowns: AcademicCountdown[]
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
  )
}

export function CountdownsView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [countdowns, setCountdowns] = useState<AcademicCountdown[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<CountdownsResponse>('/api/countdowns', {
      signal: controller.signal,
    })
      .then(({ data }) => setCountdowns(data.countdowns))
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          console.error('Failed to load countdowns for calendar:', err)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setSelectedDate(null)
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  // Calendar Grid computation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const cells: Array<{
      date: Date
      isCurrentMonth: boolean
      dayNumber: number
      countdowns: AcademicCountdown[]
      isToday: boolean
    }> = []

    const today = new Date()

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNumber = totalDaysInPrevMonth - i
      const date = new Date(currentYear, currentMonth - 1, dayNumber)
      const dayCountdowns = countdowns.filter((c) =>
        isSameCalendarDay(new Date(c.targetDate), date),
      )
      cells.push({
        date,
        isCurrentMonth: false,
        dayNumber,
        countdowns: dayCountdowns,
        isToday: isSameCalendarDay(today, date),
      })
    }

    // 2. Current month days
    for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber++) {
      const date = new Date(currentYear, currentMonth, dayNumber)
      const dayCountdowns = countdowns.filter((c) =>
        isSameCalendarDay(new Date(c.targetDate), date),
      )
      cells.push({
        date,
        isCurrentMonth: true,
        dayNumber,
        countdowns: dayCountdowns,
        isToday: isSameCalendarDay(today, date),
      })
    }

    // 3. Next month leading days to complete full weeks
    const remainingCells = (7 - (cells.length % 7)) % 7
    for (let dayNumber = 1; dayNumber <= remainingCells; dayNumber++) {
      const date = new Date(currentYear, currentMonth + 1, dayNumber)
      const dayCountdowns = countdowns.filter((c) =>
        isSameCalendarDay(new Date(c.targetDate), date),
      )
      cells.push({
        date,
        isCurrentMonth: false,
        dayNumber,
        countdowns: dayCountdowns,
        isToday: isSameCalendarDay(today, date),
      })
    }

    return cells
  }, [currentYear, currentMonth, countdowns])

  const monthName = currentDate.toLocaleString('default', { month: 'long' })

  // Selected date countdowns
  const selectedDateCountdowns = useMemo(() => {
    if (!selectedDate) return []
    return countdowns.filter((c) => isSameCalendarDay(new Date(c.targetDate), selectedDate))
  }, [selectedDate, countdowns])
  const categories = useMemo(
    () => [...new Set(countdowns.map((countdown) => countdown.category))].sort(
      (left, right) => left.localeCompare(right),
    ),
    [countdowns],
  )

  const handleCountdownSaved = (savedCountdown: AcademicCountdown) => {
    setCountdowns((current) =>
      current.some((countdown) => countdown.id === savedCountdown.id)
        ? current.map((countdown) =>
            countdown.id === savedCountdown.id ? savedCountdown : countdown,
          )
        : [...current, savedCountdown],
    )
  }

  const handleCountdownDeleted = (countdownId: string) => {
    setCountdowns((current) =>
      current.filter((countdown) => countdown.id !== countdownId),
    )
  }

  return (
    <div className="app-shell bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="eyebrow">daysmatter/calendar.sync</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Academic Deadlines & Calendar
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track upcoming exams, assignment cutoffs, and milestones with monthly visual radar.
            </p>
          </div>
        </div>

        {/* CALENDAR GRID CARD */}
        <section
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8"
          aria-labelledby="calendar-title"
        >
          {/* MONTH NAVIGATION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100" id="calendar-title">
                {monthName} {currentYear}
              </h2>
              {isLoading && (
                <span className="text-xs font-mono text-slate-400 animate-pulse">syncing deadlines…</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Today
              </button>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* 7-COLUMN DAYS HEADER */}
          <div className="grid grid-cols-7 gap-px border-b border-slate-100 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-slate-500">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* 7-COLUMN DAYS GRID */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3">
            {calendarCells.map((cell, idx) => {
              const isSelected = selectedDate ? isSameCalendarDay(selectedDate, cell.date) : false

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`relative flex min-h-[58px] sm:min-h-[72px] flex-col items-center justify-start rounded-xl p-1.5 text-center transition-all ${
                    !cell.isCurrentMonth
                      ? 'text-slate-300 opacity-40 dark:text-slate-600'
                      : cell.isToday
                        ? 'bg-blue-50/70 font-black text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 ring-2 ring-blue-500/40'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/40'
                  } ${
                    isSelected
                      ? 'ring-2 ring-blue-600 dark:ring-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                      : ''
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold">{cell.dayNumber}</span>

                  {/* DOTS FOR COUNTDOWN DEADLINES */}
                  {cell.countdowns.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                      {cell.countdowns.slice(0, 3).map((countdown) => (
                        <span
                          key={countdown.id}
                          className={`size-1.5 sm:size-2 rounded-full ${getCategoryColor(countdown.category)}`}
                          title={`${countdown.category}: ${countdown.title}`}
                        />
                      ))}
                      {cell.countdowns.length > 3 && (
                        <span className="text-[8px] font-mono text-slate-400 font-bold leading-none">
                          +{cell.countdowns.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* SELECTED DAY DETAILS ACCORDION */}
          {selectedDate && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {selectedDateCountdowns.length} {selectedDateCountdowns.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {selectedDateCountdowns.length > 0 ? (
                <ul className="mt-3 divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  {selectedDateCountdowns.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${getCategoryColor(item.category)}`} />
                        <strong className="text-slate-900 dark:text-slate-100">{item.title}</strong>
                        <span className="text-slate-400 uppercase text-[10px]">({item.category})</span>
                      </div>
                      <time className="font-mono text-slate-500">
                        {new Date(item.targetDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No deadlines scheduled on this date.</p>
              )}
            </div>
          )}

          {/* CALENDAR CATEGORY LEGEND */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Legend:</span>
            {categories.map((category) => (
              <div className="flex items-center gap-1.5" key={category}>
                <span className={`size-2 rounded-full ${getCategoryColor(category)}`} />
                <span>{category}</span>
              </div>
            ))}
            {categories.length === 0 ? <span>No categories yet</span> : null}
          </div>
        </section>

        {/* COUNTDOWN SECTION (CAROUSEL & CREATE MODAL) */}
        <CountdownSection
          onCountdownDeleted={handleCountdownDeleted}
          onCountdownSaved={handleCountdownSaved}
        />
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>daysmatter · Singapore</code>
      </footer>

      <TelegramConnectModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  )
}
