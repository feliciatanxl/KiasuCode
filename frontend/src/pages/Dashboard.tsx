import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AcademicCountdown } from '@kiasucode/shared'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { PrivacyConsentModal } from '../components/PrivacyConsentModal'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
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

  // Filter countdowns relevant today/soon (upcoming within next 14 days or closest deadlines)
  const todaysAgenda = useMemo(() => {
    const sorted = [...countdowns].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    )
    // Filter items due today or upcoming within next 14 days
    const relevant = sorted.filter((c) => {
      const days = getDaysRemaining(c.targetDate)
      return days >= 0 && days <= 14
    })

    // If no events in next 14 days, show up to 5 closest upcoming events
    return relevant.length > 0 ? relevant : sorted.slice(0, 5)
  }, [countdowns])

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
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
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

          {/* QUICK SHORTCUTS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/timer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <span>⏱️</span> Solo Sprint
            </Link>
            <Link
              to="/study-room"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <span>👥</span> Study Room
            </Link>
            <Link
              to="/campus"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <span>🏫</span> Campus Repo
            </Link>
          </div>
        </header>

        {/* 2 MAIN SECTIONS: TODAY'S AGENDA & PET OVERVIEW WIDGET */}
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
              <div className="mt-6 space-y-3">
                {todaysAgenda.map((item) => {
                  const days = getDaysRemaining(item.targetDate)
                  const badge = getUrgencyBadge(days)
                  const targetTime = new Date(item.targetDate)

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
                            {targetTime.toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            ·{' '}
                            {targetTime.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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
                  className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  + Add Deadline on Calendar
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 2: PET OVERVIEW WIDGET (1 COLUMN) */}
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
              <div className="mt-6 flex flex-col justify-between">
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
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
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
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${clampLevel(petStatus.pet.hungerLevel)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Happiness
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
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
