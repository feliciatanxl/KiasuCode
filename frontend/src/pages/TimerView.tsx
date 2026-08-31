import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Module } from '@kiasucode/shared'

import { ActivityCalendar } from '../components/ActivityCalendar'
import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { PomodoroTimer } from '../components/PomodoroTimer'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface ModulesResponse {
  modules: Module[]
}

const moduleTargetPrefix = 'module:'
const customTargetPrefix = 'custom:'
const customTargetValue = 'custom'

export function TimerView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [selectedTarget, setSelectedTarget] = useState(customTargetValue)
  const [isCustom, setIsCustom] = useState(true)
  const [customName, setCustomName] = useState('')
  const [heatmapRefreshKey, setHeatmapRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<ModulesResponse>('/api/modules', { signal: controller.signal })
      .then(({ data }) => {
        setModules(data.modules)
        if (data.modules.length > 0) {
          setSelectedTarget(`${moduleTargetPrefix}${data.modules[0].id}`)
          setIsCustom(false)
        } else {
          setSelectedTarget(customTargetValue)
          setIsCustom(true)
        }
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
  }, [])

  const selectedModuleId = selectedTarget.startsWith(moduleTargetPrefix)
    ? selectedTarget.slice(moduleTargetPrefix.length)
    : null
  const selectedCustomCategory = selectedTarget.startsWith(customTargetPrefix)
    ? selectedTarget.slice(customTargetPrefix.length)
    : isCustom
      ? customName.trim() || null
      : null
  const selectedModule = modules.find((module) => module.id === selectedModuleId)
  const selectedTargetLabel = selectedModule?.moduleCode ?? selectedCustomCategory

  const handleTargetChange = (value: string) => {
    setSelectedTarget(value)
    if (value === customTargetValue) {
      setIsCustom(true)
    } else if (value.startsWith(customTargetPrefix)) {
      setIsCustom(true)
      setCustomName(value.slice(customTargetPrefix.length))
    } else {
      setIsCustom(false)
    }
  }

  const handleConfirmCustomCategory = () => {
    const trimmed = customName.trim()
    if (!trimmed) return

    if (!customCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed])
    }
    setSelectedTarget(`${customTargetPrefix}${trimmed}`)
    setIsCustom(true)
    showToast(`🎯 Locked target: "${trimmed}"`)
  }

  return (
    <div className="app-shell bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* HEADER */}
        <div>
          <span className="eyebrow">focus/pomodoro.standalone</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Solo Pomodoro Focus Sprint
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Time to chiong this sprint. Start the Pomodoro, lock in your focus branch, and earn one study coin for every completed minute lah!
          </p>
        </div>

        {/* 2-COLUMN RESPONSIVE GRID */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN: POMODORO TIMER (H-FULL DIRECT CARD) */}
          <div className="h-full w-full flex flex-col">
            {selectedTargetLabel ? (
              <PomodoroTimer
                key={isCustom ? `${customTargetValue}:${selectedCustomCategory}` : selectedTarget}
                moduleId={selectedModule?.id ?? null}
                customCategory={selectedCustomCategory}
                targetLabel={selectedTargetLabel}
                onSessionCompleted={(coinsEarned, coinsBalance) => {
                  showToast(`Session completed! +${coinsEarned} coins (Balance: ${coinsBalance}).`)
                  setHeatmapRefreshKey((current) => current + 1)
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800 w-full">
                <span className="text-5xl" role="img" aria-label="Timer">⏱️</span>
                <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                  Select a Study Target First Lah
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Choose an academic module or enter a custom category on the right before you chiong your focus sprint.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ACTIVE STUDY TARGET PANEL */}
          <section
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8 w-full"
            aria-labelledby="module-select-title"
          >
            <span className="eyebrow">academic.target/select</span>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white" id="module-select-title">
              Active Study Target
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Select an academic module or custom category for this focus block. Don't slack hor!
            </p>

            <div className="mt-6">
              {isLoading ? (
                <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />
              ) : (
                <div className="space-y-4">
                  {/* TOP BOX: CLEAN DROPDOWN */}
                  <div>
                    <label htmlFor="module-picker" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      TARGET MODULE OR CATEGORY
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="module-picker"
                        value={selectedTarget}
                        onChange={(e) => handleTargetChange(e.target.value)}
                        className="h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-bold text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-900"
                      >
                        {modules.length > 0 && (
                          <optgroup label="Academic Modules">
                            {modules.map((module) => (
                              <option
                                key={module.id}
                                value={`${moduleTargetPrefix}${module.id}`}
                              >
                                {module.moduleCode} · {module.moduleName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {customCategories.length > 0 && (
                          <optgroup label="Custom Categories">
                            {customCategories.map((category) => (
                              <option
                                key={category}
                                value={`${customTargetPrefix}${category}`}
                              >
                                🏷️ {category}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="New Custom Category">
                          <option value={customTargetValue}>
                            + Create Custom Category
                          </option>
                        </optgroup>
                      </select>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-300"
                      >
                        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* BOTTOM BOX: CLEAN CUSTOM CATEGORY INPUT WITH BLUE TICK CONFIRM BUTTON */}
                  {isCustom && (
                    <div>
                      <label
                        htmlFor="custom-category-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        CUSTOM CATEGORY NAME
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          id="custom-category-name"
                          type="text"
                          value={customName}
                          onChange={(event) => setCustomName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleConfirmCustomCategory()
                            }
                          }}
                          maxLength={255}
                          placeholder="e.g., Side Hustle or Life Admin"
                          className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmCustomCategory}
                          disabled={!customName.trim()}
                          className="grid size-12 place-items-center rounded-xl bg-blue-600 font-black text-white shadow-sm transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
                          title="Confirm and lock category as active target"
                          aria-label="Confirm custom category"
                        >
                          <span className="text-lg">✓</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODULE OR CUSTOM CATEGORY PREVIEW CARD */}
                  {selectedModule && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {selectedModule.moduleCode}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedModule.creditUnits} MCs / Units
                        </span>
                      </div>
                      <strong className="mt-1 block text-sm font-bold text-gray-900 dark:text-white">
                        {selectedModule.moduleName}
                      </strong>
                    </div>
                  )}

                  {selectedCustomCategory && (
                    <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        CUSTOM CATEGORY
                      </span>
                      <strong className="mt-1 block text-sm font-bold text-gray-900 dark:text-white">
                        {selectedCustomCategory}
                      </strong>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        This session tracked separately—no module linked, but still can earn coins and chiong your personal tasks!
                      </p>
                    </div>
                  )}

                  {modules.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      Want academic tracking also?{' '}
                      <Link to="/campus" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        Add a module in Campus Repo lah.
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>🪙</span> Focus Sprint Reward
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Completing your Pomodoro focus block grants one coin per minute to feed your Tamagotchi pet. Steady pom pi pi!
              </p>
            </div>
            <ActivityCalendar refreshKey={heatmapRefreshKey} />
          </section>
        </div>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>focus · Singapore</code>
      </footer>

      <TelegramConnectModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  )
}
