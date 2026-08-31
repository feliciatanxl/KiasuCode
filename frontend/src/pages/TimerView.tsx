import { useEffect, useMemo, useState } from 'react'
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

const PRESET_CATEGORIES = [
  'LeetCode Practice',
  'Finals Revision',
  'Assignment Sprint',
  'Side Project',
  'Life Admin',
]

export function TimerView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [targetInput, setTargetInput] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
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
          setSelectedModuleId(data.modules[0].id)
          setTargetInput(data.modules[0].moduleCode)
        } else {
          setTargetInput('Finals Revision')
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

  // Check if targetInput corresponds to a registered academic module
  const matchedModule = useMemo(() => {
    const trimmed = targetInput.trim().toLowerCase()
    if (!trimmed) return null

    // Match by ID
    if (selectedModuleId) {
      const byId = modules.find((m) => m.id === selectedModuleId)
      if (byId && (byId.moduleCode.toLowerCase() === trimmed || targetInput === `${byId.moduleCode} · ${byId.moduleName}`)) {
        return byId
      }
    }

    // Match by Code
    return modules.find(
      (m) =>
        m.moduleCode.toLowerCase() === trimmed ||
        `${m.moduleCode} · ${m.moduleName}`.toLowerCase() === trimmed,
    ) || null
  }, [targetInput, selectedModuleId, modules])

  const selectedModule = matchedModule
  const customCategory = !selectedModule && targetInput.trim() ? targetInput.trim() : null
  const selectedTargetLabel = selectedModule?.moduleCode ?? customCategory

  const handleSelectModule = (mod: Module) => {
    setSelectedModuleId(mod.id)
    setTargetInput(mod.moduleCode)
  }

  const handleSelectCategory = (cat: string) => {
    setSelectedModuleId(null)
    setTargetInput(cat)
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
          {/* LEFT COLUMN: POMODORO TIMER PANEL */}
          <section
            className="h-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10 w-full"
            aria-label="Pomodoro Timer"
          >
            {selectedTargetLabel ? (
              <div className="w-full">
                <PomodoroTimer
                  key={selectedTargetLabel}
                  moduleId={selectedModule?.id ?? null}
                  customCategory={customCategory}
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
                  Type or select an academic module or custom category on the right before you start your focus block.
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
              Type any category directly or pick from your enrolled modules. Auto-selected instantly!
            </p>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />
              ) : (
                <>
                  {/* UNIFIED INPUT / DROPDOWN EXPERIENCE */}
                  <div>
                    <label
                      htmlFor="target-input-field"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
                    >
                      Target Module or Custom Category
                    </label>
                    <div className="relative">
                      <input
                        id="target-input-field"
                        list="unified-target-options"
                        type="text"
                        value={targetInput}
                        onChange={(e) => {
                          setTargetInput(e.target.value)
                          setSelectedModuleId(null)
                        }}
                        placeholder="Type or pick a target (e.g. CS2040C, LeetCode, Side Project)…"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-900"
                      />
                      <datalist id="unified-target-options">
                        {modules.map((m) => (
                          <option key={m.id} value={m.moduleCode}>
                            {m.moduleCode} · {m.moduleName}
                          </option>
                        ))}
                        {PRESET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* QUICK SUGGESTIONS CHIPS */}
                  <div>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Quick Suggestions
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {modules.map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleSelectModule(mod)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                            selectedModule?.id === mod.id
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                              : 'border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60'
                          }`}
                        >
                          📚 {mod.moduleCode}
                        </button>
                      ))}
                      {PRESET_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                            customCategory?.toLowerCase() === cat.toLowerCase()
                              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/30'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          ⚡ {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ACTIVE TARGET SUMMARY CARD */}
                  {selectedModule ? (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                          ACADEMIC MODULE · {selectedModule.moduleCode}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedModule.creditUnits} MCs
                        </span>
                      </div>
                      <strong className="mt-1 block text-sm text-slate-900 dark:text-slate-100">
                        {selectedModule.moduleName}
                      </strong>
                    </div>
                  ) : customCategory ? (
                    <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/60 dark:bg-purple-950/30">
                      <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                        CUSTOM FOCUS CATEGORY
                      </span>
                      <strong className="mt-1 block text-sm text-slate-900 dark:text-slate-100">
                        {customCategory}
                      </strong>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Tracked for this session. Complete minutes to earn study coins for your pet!
                      </p>
                    </div>
                  ) : null}

                  {modules.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      Want module-linked tracking?{' '}
                      <Link to="/campus" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        Add a module in Campus Repo.
                      </Link>
                    </p>
                  )}
                </>
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
