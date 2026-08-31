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
const customTargetValue = 'custom'

export function TimerView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
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
  const selectedCustomCategory = isCustom ? customName.trim() || null : null
  const selectedModule = modules.find((module) => module.id === selectedModuleId)
  const selectedTargetLabel = selectedModule?.moduleCode ?? selectedCustomCategory

  const handleTargetChange = (value: string) => {
    setSelectedTarget(value)
    setIsCustom(value === customTargetValue)
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

        {/* 2-COLUMN RESPONSIVE GRID MATCHING STUDY ROOM */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN: POMODORO TIMER PANEL */}
          <section
            className="h-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10 w-full"
            aria-label="Pomodoro Timer"
          >
            {selectedTargetLabel ? (
              <div className="w-full">
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
              </div>
            ) : (
              <div className="py-16 text-center w-full">
                <span className="text-5xl" role="img" aria-label="Timer">⏱️</span>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Select a Study Target First Lah
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Choose an academic module or custom category from the right panel before you chiong your focus sprint.
                </p>
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: ACTIVE STUDY TARGET PANEL */}
          <section
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8 w-full"
            aria-labelledby="module-select-title"
          >
            <span className="eyebrow">academic.target/select</span>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100" id="module-select-title">
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
                  <label htmlFor="module-picker" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Module or Category
                  </label>
                  <div className="relative">
                    <select
                      id="module-picker"
                      value={selectedTarget}
                      onChange={(e) => handleTargetChange(e.target.value)}
                      className="h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-bold text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      {modules.length > 0 ? (
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
                      ) : null}
                      <optgroup label="Custom Category">
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

                  {isCustom ? (
                    <div>
                      <label
                        htmlFor="custom-category-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        Custom Category Name
                      </label>
                      <input
                        id="custom-category-name"
                        type="text"
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        maxLength={255}
                        autoFocus
                        placeholder="e.g., Side Hustle or Life Admin"
                        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  ) : null}

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
                      <strong className="mt-1 block text-sm text-slate-900 dark:text-slate-100">
                        {selectedModule.moduleName}
                      </strong>
                    </div>
                  )}
                  {selectedCustomCategory ? (
                    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                      <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                        CUSTOM CATEGORY
                      </span>
                      <strong className="mt-1 block text-sm text-slate-900 dark:text-slate-100">
                        {selectedCustomCategory}
                      </strong>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        This session tracked separately—no module linked, but still can earn coins and chiong your personal tasks!
                      </p>
                    </div>
                  ) : null}
                  {modules.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Want academic tracking also?{' '}
                      <Link to="/dashboard" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        Add a module on the Dashboard lah.
                      </Link>
                    </p>
                  ) : null}
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
