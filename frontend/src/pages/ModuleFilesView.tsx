import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Module } from '@kiasucode/shared'

import { ModuleFilesList } from '../components/ModuleFilesList'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface ModulesResponse {
  modules: Module[]
}

export function ModuleFilesView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="app-shell min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* PAGE HEADER */}
        <div>
          <span className="eyebrow">modules/documents.assets</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Module Documents & Assets
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Centralized document vault to organize, upload, and download notes, cheatsheets, and assignments for your modules.
          </p>
        </div>

        {/* MODULE SELECTOR DROPDOWN */}
        <div className="mt-6">
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6"
            aria-labelledby="module-select-heading"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="module-select-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Target Module
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Select a module from your active semester to view and manage its uploaded files.
                </p>
              </div>

              <div className="w-full sm:w-80">
                {isLoading ? (
                  <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />
                ) : modules.length > 0 ? (
                  <div className="relative">
                    <select
                      id="module-files-picker"
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="h-12 w-full appearance-none truncate rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-bold text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose a Module --</option>
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
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No modules available.</p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}
          </section>
        </div>

        {/* ATTACHMENTS LIST OR EMPTY STATE */}
        <div className="mt-6">
          {selectedModule ? (
            <ModuleFilesList
              key={selectedModule.id}
              moduleId={selectedModule.id}
              moduleCode={selectedModule.moduleCode}
            />
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="text-5xl" role="img" aria-label="Documents">📁</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                {modules.length === 0 ? 'No Modules Found' : 'No Module Selected'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {modules.length === 0
                  ? 'Add at least one module under an institution and semester on your Dashboard to start uploading notes and cheatsheets.'
                  : 'Please select a module from the dropdown above to view, upload, or download documents.'}
              </p>
              {modules.length === 0 && (
                <div className="mt-6">
                  <Link to="/dashboard" className="button button--primary inline-flex">
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
