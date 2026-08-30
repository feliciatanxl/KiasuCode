import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Module } from '@kiasucode/shared'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { PomodoroTimer } from '../components/PomodoroTimer'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface ModulesResponse {
  modules: Module[]
}

export function TimerView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<ModulesResponse>('/api/modules', { signal: controller.signal })
      .then(({ data }) => {
        setModules(data.modules)
        if (data.modules.length > 0) {
          setSelectedModuleId(data.modules[0].id)
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

  const selectedModule = modules.find((m) => m.id === selectedModuleId)

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
            Choose a focus length, lock in, and earn one study coin for every completed minute.
          </p>
        </div>

        {/* 2-COLUMN RESPONSIVE GRID MATCHING STUDY ROOM */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN: POMODORO TIMER PANEL */}
          <section
            className="h-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10 w-full"
            aria-label="Pomodoro Timer"
          >
            {selectedModule ? (
              <div className="w-full">
                <PomodoroTimer
                  key={selectedModule.id}
                  moduleId={selectedModule.id}
                  moduleCode={selectedModule.moduleCode}
                  onSessionCompleted={(coinsEarned, coinsBalance) =>
                    showToast(`Session completed! +${coinsEarned} coins (Balance: ${coinsBalance}).`)
                  }
                />
              </div>
            ) : (
              <div className="py-16 text-center w-full">
                <span className="text-5xl" role="img" aria-label="Timer">⏱️</span>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {modules.length === 0 ? 'No Modules Found' : 'Select a Target Module'}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  {modules.length === 0
                    ? 'Add at least one module under an institution/semester on the Dashboard to record study sessions.'
                    : 'Choose an academic module from the right panel to activate the Pomodoro timer and earn study coins.'}
                </p>
                {modules.length === 0 && (
                  <Link to="/dashboard" className="button button--primary mt-5 inline-flex">
                    Go to Dashboard
                  </Link>
                )}
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
              Select which academic module your focus time will be logged to.
            </p>

            <div className="mt-6">
              {isLoading ? (
                <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />
              ) : modules.length > 0 ? (
                <div className="space-y-4">
                  <label htmlFor="module-picker" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Module
                  </label>
                  <div className="relative">
                    <select
                      id="module-picker"
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-bold text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose Module --</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.moduleCode} · {module.moduleName}
                        </option>
                      ))}
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
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No academic modules configured.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Create your modules first on the Dashboard to start tracking focus time.
                  </p>
                  <Link
                    to="/dashboard"
                    className="mt-4 inline-flex rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-blue-500"
                  >
                    + Add Module on Dashboard
                  </Link>
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
                Completing the selected Pomodoro duration grants one coin per minute to feed your Tamagotchi pet companion.
              </p>
            </div>
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
