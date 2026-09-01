import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AcademicCountdown, ClassScheduleItem, DayOfWeek } from '@kiasucode/shared'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { PrivacyConsentModal } from '../components/PrivacyConsentModal'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { TodoList } from '../components/TodoList'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import { defaultCountdownColor, resolveCountdownColor } from '../utils/colors'
import { getPetConfig } from '../utils/petRoster'

interface CountdownsResponse {
  countdowns: AcademicCountdown[]
}

interface Pet {
  id: string
  name: string
  firstName?: string
  petType?: string
  hungerLevel: number
  happinessLevel: number
  lastInteractedAt: string
}

interface PetStatusResponse {
  pet: Pet
  wallet: {
    coinsBalance: number
  }
}

interface FeedPetResponse extends PetStatusResponse {
  purchase: {
    cost: number
  }
}

const foodCost = 20

function clampLevel(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function getDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate).getTime()
  const now = new Date().getTime()
  const diffMs = target - now
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function getUrgencyBadge(daysRemaining: number) {
  if (daysRemaining < 0) {
    return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800' }
  }
  if (daysRemaining === 0) {
    return { label: 'Due Today', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse' }
  }
  if (daysRemaining === 1) {
    return { label: 'Tomorrow', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
  }
  if (daysRemaining <= 7) {
    return { label: `In ${daysRemaining} days`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
  }
  return { label: `In ${daysRemaining} days`, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
}

export function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)

  // Countdowns State (Today's Agenda)
  const [countdowns, setCountdowns] = useState<AcademicCountdown[]>([])
  const [isLoadingCountdowns, setIsLoadingCountdowns] = useState(true)
  const [countdownsError, setCountdownsError] = useState<string | null>(null)

  // Schedules State (Mini iPod Widget)
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true)

  // Pet State (Pet Overview Widget)
  const [petStatus, setPetStatus] = useState<PetStatusResponse | null>(null)
  const [isLoadingPet, setIsLoadingPet] = useState(true)
  const [isFeeding, setIsFeeding] = useState(false)
  const [petError, setPetError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<CountdownsResponse>('/api/countdowns', {
      signal: controller.signal,
    })
      .then(({ data }) => setCountdowns(data.countdowns))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setCountdownsError(formatApiError(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingCountdowns(false)
      })

    void apiRequest<{ schedules: ClassScheduleItem[] }>('/api/schedules', {
      signal: controller.signal,
    })
      .then(({ data }) => setSchedules(data.schedules || []))
      .catch((err: unknown) => {
        if (!isAbortError(err)) console.error('Failed to load schedules for dashboard:', err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSchedules(false)
      })

    void apiRequest<PetStatusResponse>('/api/pet', {
      signal: controller.signal,
    })
      .then(({ data }) => setPetStatus(data))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setPetError(formatApiError(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingPet(false)
      })

    return () => controller.abort()
  }, [])

interface AgendaItem {
  id: string
  title: string
  category: string
  color?: string
  startDate: string
  endDate?: string
  daysRemaining: number
}

function isSameCalendarDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

  // Filter countdowns relevant today/soon (upcoming within next 14 days or closest deadlines)
  const todaysAgenda = useMemo(() => {
    const sorted = [...countdowns].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    )

    // Deduplicate / consolidate multi-day items (either explicit endDate or consecutive identical title/category entries)
    const consolidated: AgendaItem[] = []

    for (const item of sorted) {
      const itemStart = item.targetDate
      const itemEnd = item.endDate || item.targetDate

      // Check if this item belongs to an existing multi-day cluster
      const existing = consolidated.find((c) => {
        if (c.title !== item.title || c.category !== item.category) return false
        const cEnd = new Date(c.endDate || c.startDate)
        const currentStart = new Date(itemStart)
        // Check if current item starts on the same day or within 1.5 days of previous item's end
        const diffMs = currentStart.getTime() - cEnd.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        return diffDays >= 0 && diffDays <= 1.5
      })

      if (existing) {
        // Extend existing cluster end date
        const existingEnd = new Date(existing.endDate || existing.startDate).getTime()
        const newEnd = new Date(itemEnd).getTime()
        if (newEnd > existingEnd) {
          existing.endDate = itemEnd
        }
      } else {
        consolidated.push({
          id: item.id,
          title: item.title,
          category: item.category,
          color: item.color,
          startDate: itemStart,
          endDate: item.endDate && !isSameCalendarDate(new Date(itemStart), new Date(item.endDate)) ? item.endDate : undefined,
          daysRemaining: getDaysRemaining(itemStart),
        })
      }
    }

    // Filter items due today, ongoing, or upcoming within next 14 days
    const relevant = consolidated.filter((c) => {
      const startDays = getDaysRemaining(c.startDate)
      const endDays = c.endDate ? getDaysRemaining(c.endDate) : startDays
      return endDays >= 0 && startDays <= 14
    })

    // If no events in next 14 days, show up to 5 closest upcoming events
    return relevant.length > 0 ? relevant : consolidated.slice(0, 5)
  }, [countdowns])

  // Upcoming class calculation for iPod Mini Timetable
  const upcomingClassInfo = useMemo(() => {
    if (!schedules.length) return null

    const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const now = new Date()
    const currentDay = dayMap[now.getDay()]
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }

    // 1. Look for remaining or current class today
    const todaysClasses = schedules
      .filter((s) => s.dayOfWeek === currentDay)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))

    const nextToday = todaysClasses.find((s) => parseTimeToMinutes(s.endTime) >= currentMinutes)
    if (nextToday) {
      const isNow = parseTimeToMinutes(nextToday.startTime) <= currentMinutes
      return { classItem: nextToday, isToday: true, isNow, dayLabel: 'Today' }
    }

    // 2. Look for upcoming days in circular sequence
    const dayOrder: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const todayIndex = dayOrder.indexOf(currentDay)

    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = dayOrder[(todayIndex + offset) % 7]
      const nextDayClasses = schedules
        .filter((s) => s.dayOfWeek === nextDay)
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))

      if (nextDayClasses.length > 0) {
        return {
          classItem: nextDayClasses[0],
          isToday: false,
          isNow: false,
          dayLabel: offset === 1 ? 'Tomorrow' : nextDay,
        }
      }
    }

    return null
  }, [schedules])

  const feedPet = async () => {
    if (!petStatus || isFeeding) return

    setIsFeeding(true)
    setPetError(null)

    try {
      const { data } = await apiRequest<FeedPetResponse>('/api/pet/buy-food', {
        method: 'POST',
      })

      setPetStatus({ pet: data.pet, wallet: data.wallet })
      showToast(`${data.pet.name} loved the food! -${data.purchase.cost} coins.`)
    } catch (feedError) {
      setPetError(formatApiError(feedError))
    } finally {
      setIsFeeding(false)
    }
  }

  const canAffordFood =
    petStatus !== null && petStatus.wallet.coinsBalance >= foodCost

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* DAILY HUB HEADER */}
        <header className="mb-8 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>daily.hub / active-session</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your Daily Academic Command Center. Keep deadlines in check, feed your pet, and push straight to production.
            </p>
          </div>
        </header>

        {/* TOP ROW: TODAY'S AGENDA (SPAN 2) & MINI IPOD TIMETABLE WIDGET (SPAN 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* SECTION 1: TODAY'S AGENDA (SPAN 2 COLUMNS) */}
          <section
            className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8 flex flex-col h-full"
            aria-labelledby="agenda-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700/80">
              <div>
                <span className="eyebrow">radar/upcoming</span>
                <h2
                  className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                  id="agenda-title"
                >
                  Today's Agenda & Urgent Milestones
                </h2>
              </div>
              <Link
                to="/countdowns"
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
              >
                Full Calendar Radar <span>→</span>
              </Link>
            </div>

            {countdownsError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {countdownsError}
              </p>
            ) : null}

            {isLoadingCountdowns ? (
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50"
                  />
                ))}
              </div>
            ) : todaysAgenda.length > 0 ? (
              <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {todaysAgenda.map((item) => {
                  const startDateObj = new Date(item.startDate)
                  const endDateObj = item.endDate ? new Date(item.endDate) : null
                  const isMultiDay = Boolean(endDateObj && !isSameCalendarDate(startDateObj, endDateObj))

                  const daysToStart = getDaysRemaining(item.startDate)
                  const daysToEnd = endDateObj ? getDaysRemaining(item.endDate!) : daysToStart

                  let badge: { label: string; color: string }
                  if (isMultiDay && daysToStart <= 0 && daysToEnd >= 0) {
                    badge = {
                      label: daysToEnd === 0 ? 'Ends Today' : 'Ongoing',
                      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 animate-pulse',
                    }
                  } else {
                    badge = getUrgencyBadge(daysToStart)
                  }

                  const hasStartTime = startDateObj.getHours() !== 0 || startDateObj.getMinutes() !== 0
                  const hasEndTime = endDateObj ? (endDateObj.getHours() !== 0 || endDateObj.getMinutes() !== 0) : false

                  const startDateFormatted = startDateObj.toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  const startTimeFormatted = startDateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  let dateDisplay = ''
                  if (isMultiDay && endDateObj) {
                    const endDateFormatted = endDateObj.toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                    if (hasStartTime && hasEndTime) {
                      const endTimeFormatted = endDateObj.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      dateDisplay = `${startDateFormatted} (${startTimeFormatted}) – ${endDateFormatted} (${endTimeFormatted})`
                    } else if (hasStartTime) {
                      dateDisplay = `${startDateFormatted} – ${endDateFormatted} · ${startTimeFormatted}`
                    } else {
                      dateDisplay = `${startDateFormatted} – ${endDateFormatted}`
                    }
                  } else {
                    dateDisplay = `${startDateFormatted} · ${startTimeFormatted}`
                  }

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className="size-3.5 shrink-0 rounded-full shadow-xs"
                          style={{
                            backgroundColor: resolveCountdownColor(
                              item.color || defaultCountdownColor,
                            ),
                          }}
                          title={`Category: ${item.category}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                              {item.title}
                            </strong>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {item.category}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {dateDisplay}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-6 flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-700 dark:bg-slate-900/20">
                <span className="text-4xl" role="img" aria-label="Celebration">🎉</span>
                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  No urgent deadlines in sight!
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  No deadlines yet. Checkout to a new branch and chiong your assignments!
                </p>
                <Link
                  to="/countdowns"
                  className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold !text-white text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  + Add Deadline on Calendar
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 2: MINI IPOD TIMETABLE (FLOATING NAKED DEVICE) */}
          <div className="flex flex-col items-center justify-center">
            {isLoadingSchedules ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="size-16 animate-pulse rounded-full bg-blue-100 dark:bg-blue-950/60" />
                <p className="mt-3 text-xs text-slate-400">Syncing timetable…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                {/* Mini iPod Shell */}
                <div className="relative w-full max-w-[250px] sm:max-w-[270px] rounded-[36px] p-4 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-300/80 dark:border-slate-600 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.9)_inset] select-none">
                  {/* Gloss reflex */}
                  <div className="absolute top-2 left-6 right-6 h-2.5 rounded-full bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

                  {/* iPod Color Screen */}
                  <div className="relative rounded-2xl border-4 border-slate-900/90 bg-gradient-to-b from-[#c3e3f7] to-[#91c5e4] dark:from-[#132c3f] dark:to-[#0a1824] p-3.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.35)] text-slate-900 dark:text-cyan-50 flex flex-col justify-between h-40 overflow-hidden font-sans">
                    {/* Top Status Bar */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-900/15 dark:border-cyan-400/20 text-[10px] font-bold">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">▶</span>
                        <span className="truncate">
                          {upcomingClassInfo?.isNow ? 'Now Classing' : 'Up Next'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <div className="h-2.5 w-4 rounded-2xs border border-slate-900/70 dark:border-cyan-200/70 p-0.5 flex items-center">
                          <div className="h-full w-3/4 rounded-3xs bg-emerald-600 dark:bg-emerald-400" />
                        </div>
                        <div className="h-1 w-0.5 rounded-r bg-slate-900/70 dark:bg-cyan-200/70" />
                      </div>
                    </div>

                    {/* Main Screen Body */}
                    {upcomingClassInfo?.classItem ? (
                      <div className="flex items-center gap-2.5 my-auto">
                        <div
                          className="size-11 rounded-lg shadow-sm flex items-center justify-center text-lg text-white font-black shrink-0 border border-white/40"
                          style={{ backgroundColor: upcomingClassInfo.classItem.color || '#3b82f6' }}
                        >
                          🎓
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black truncate leading-tight text-slate-950 dark:text-white">
                            {upcomingClassInfo.classItem.title}
                          </h4>
                          {upcomingClassInfo.classItem.instructor && (
                            <p className="text-[10px] font-semibold text-slate-700 dark:text-cyan-200 truncate mt-0.5">
                              {upcomingClassInfo.classItem.instructor}
                            </p>
                          )}
                          {upcomingClassInfo.classItem.roomLocation && (
                            <p className="text-[9px] font-mono text-slate-600 dark:text-cyan-300/80 truncate">
                              {upcomingClassInfo.classItem.roomLocation}
                            </p>
                          )}
                          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mt-0.5">
                            {upcomingClassInfo.dayLabel} · {upcomingClassInfo.classItem.startTime} - {upcomingClassInfo.classItem.endTime}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center my-auto py-1">
                        <span className="text-xl">🏖️</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-cyan-50 mt-0.5">
                          No upcoming classes
                        </p>
                        <p className="text-[9px] text-slate-700 dark:text-cyan-300/80">
                          You're all clear!
                        </p>
                      </div>
                    )}

                    {/* Bottom Scrubber Bar */}
                    <div className="pt-1 border-t border-slate-900/10 dark:border-cyan-400/20">
                      <div className="h-1 w-full rounded-full bg-slate-900/20 dark:bg-cyan-950 overflow-hidden">
                        <div className="h-full w-2/3 rounded-full bg-blue-600 dark:bg-cyan-400 shadow-xs" />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-slate-600 dark:text-cyan-300 mt-0.5">
                        <span>{upcomingClassInfo?.classItem.startTime || '00:00'}</span>
                        <span>{upcomingClassInfo?.classItem.endTime || '00:00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Click Wheel */}
                  <div className="mt-3.5 flex justify-center">
                    <Link
                      to="/schedule"
                      className="size-28 rounded-full bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-300/90 dark:border-slate-600 shadow-[0_4px_8px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.9)] relative flex items-center justify-center hover:scale-105 transition-transform"
                      title="Open full timetable"
                    >
                      <span className="absolute top-1.5 text-[7px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                        MENU
                      </span>
                      <span className="absolute left-2 text-[8px] font-bold text-slate-500 dark:text-slate-400">
                        |◀◀
                      </span>
                      <span className="absolute right-2 text-[8px] font-bold text-slate-500 dark:text-slate-400">
                        ▶▶|
                      </span>
                      <span className="absolute bottom-1.5 text-[8px] font-bold text-slate-500 dark:text-slate-400">
                        ▶||
                      </span>
                      <div className="size-11 rounded-full bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] flex items-center justify-center">
                        <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                          SELECT
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: PET OVERVIEW & TO-DO LIST (SIDE BY SIDE) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* PET OVERVIEW WIDGET */}
          <section
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8 flex flex-col h-full justify-between"
            aria-labelledby="pet-widget-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700/80">
              <div>
                <span className="eyebrow">companion/live</span>
                <h2
                  className="mt-1 text-lg font-bold text-slate-900 dark:text-white"
                  id="pet-widget-title"
                >
                  Pet Overview
                </h2>
              </div>
              <Link
                to="/pet"
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                Care Room →
              </Link>
            </div>

            {isLoadingPet ? (
              <div className="mt-6 flex flex-col items-center justify-center py-8">
                <div className="size-16 animate-pulse rounded-full bg-blue-100 dark:bg-blue-950/60" />
                <p className="mt-3 text-xs text-slate-400">Loading companion status…</p>
              </div>
            ) : petStatus?.pet ? (
              <div className="mt-6 flex flex-col justify-between flex-1">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-blue-100 bg-blue-50 text-4xl shadow-inner dark:border-blue-900/60 dark:bg-blue-950/40"
                    aria-hidden="true"
                  >
                    {getPetConfig(petStatus.pet.petType).avatar}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {getPetConfig(petStatus.pet.petType).title}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {petStatus.pet.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        🪙 {petStatus.wallet.coinsBalance} coins
                      </span>
                    </div>
                  </div>
                </div>

                {/* STAT METERS */}
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Hunger
                      </span>
                      <span className="font-mono text-slate-500">
                        {clampLevel(petStatus.pet.hungerLevel)}/100
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                      role="progressbar"
                      aria-label="Hunger level"
                      aria-valuenow={clampLevel(petStatus.pet.hungerLevel)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${clampLevel(petStatus.pet.hungerLevel)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Happiness
                      </span>
                      <span className="font-mono text-slate-500">
                        {clampLevel(petStatus.pet.happinessLevel)}/100
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                      role="progressbar"
                      aria-label="Happiness level"
                      aria-valuenow={clampLevel(petStatus.pet.happinessLevel)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${clampLevel(petStatus.pet.happinessLevel)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* FEED ACTION */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => void feedPet()}
                    disabled={isFeeding || !canAffordFood}
                    className="w-full rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFeeding
                      ? 'Feeding…'
                      : canAffordFood
                        ? `Feed Pet (20 coins)`
                        : `Need 20 coins to feed`}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    Earn coins with solo or group Pomodoro focus sprints.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-6">
                <p className="text-xs text-red-500">{petError ?? 'Pet status unavailable.'}</p>
              </div>
            )}
          </section>

          {/* TO-DO LIST WIDGET */}
          <section className="h-full flex flex-col">
            <TodoList className="h-full flex flex-col justify-between" />
          </section>
        </div>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>hub: daily · latency: 0ms</code>
      </footer>

      <PrivacyConsentModal isOpen={user !== null && user.hasConsented === false} />

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
