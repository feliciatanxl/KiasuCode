import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import type {
  AcademicSemester,
  Institution,
  Module,
} from '@kiasucode/shared'

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from '../components/Breadcrumbs'
import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import { ModulesView } from './ModulesView'
import { SemestersView } from './SemestersView'

interface InstitutionDirectory {
  kind: 'institution'
  value: Institution
}

interface SemesterDirectory {
  kind: 'semester'
  value: AcademicSemester
}

type DirectoryEntry = InstitutionDirectory | SemesterDirectory

interface InstitutionsResponse {
  institutions: Institution[]
}

interface InstitutionResponse {
  institution: Institution
}

interface SemestersResponse {
  semesters: AcademicSemester[]
}

interface ModulesResponse {
  modules: Module[]
}

interface ModuleResponse {
  module: Module
}

function DirectoryButton({
  label,
  detail,
  onClick,
}: {
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
      type="button"
      onClick={onClick}
    >
      <span>
        <strong className="block text-sm text-slate-900 dark:text-slate-100">{label}</strong>
        <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{detail}</small>
      </span>
      <span className="text-xl text-blue-500" aria-hidden="true">→</span>
    </button>
  )
}

export function Dashboard() {
  const [directoryStack, setDirectoryStack] = useState<DirectoryEntry[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [isInstitutionFormOpen, setIsInstitutionFormOpen] = useState(false)
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false)
  const [institutionName, setInstitutionName] = useState('')
  const [institutionError, setInstitutionError] = useState<string | null>(null)
  const { sessionToken } = useAuth()
  const { showToast } = useToast()

  const depth = directoryStack.length
  const institutionEntry = directoryStack[0]
  const semesterEntry = directoryStack[1]
  const selectedInstitution = institutionEntry?.kind === 'institution'
    ? institutionEntry.value
    : null
  const selectedSemester = semesterEntry?.kind === 'semester'
    ? semesterEntry.value
    : null
  const semesterLabel = selectedSemester
    ? `${selectedSemester.academicYear} · ${selectedSemester.term}`
    : ''

  useEffect(() => {
    if (!sessionToken) return

    const controller = new AbortController()

    void apiRequest<InstitutionsResponse>('/api/institutions', sessionToken, {
      signal: controller.signal,
    })
      .then(({ data }) => setInstitutions(data.institutions))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setApiError(formatApiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken || !selectedInstitution) return

    const controller = new AbortController()

    void apiRequest<SemestersResponse>(
      `/api/institutions/${selectedInstitution.id}/semesters`,
      sessionToken,
      { signal: controller.signal },
    )
      .then(({ data }) => setSemesters(data.semesters))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setApiError(formatApiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [selectedInstitution, sessionToken])

  useEffect(() => {
    if (!sessionToken || !selectedSemester) return

    const controller = new AbortController()

    void apiRequest<ModulesResponse>(
      `/api/semesters/${selectedSemester.id}/modules`,
      sessionToken,
      { signal: controller.signal },
    )
      .then(({ data }) => setModules(data.modules))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setApiError(formatApiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [selectedSemester, sessionToken])

  const popToDepth = useCallback((targetDepth: number) => {
    setDirectoryStack((stack) => stack.slice(0, targetDepth))
    if (targetDepth < 2) setModules([])
    if (targetDepth < 1) setSemesters([])
    setIsLoading(false)
    setApiError(null)
  }, [])

  const openInstitution = (institution: Institution) => {
    setSemesters([])
    setModules([])
    setIsLoading(true)
    setApiError(null)
    setDirectoryStack([{ kind: 'institution', value: institution }])
  }

  const openSemester = (semester: AcademicSemester) => {
    if (!selectedInstitution) return

    setModules([])
    setIsLoading(true)
    setApiError(null)
    setDirectoryStack([
      { kind: 'institution', value: selectedInstitution },
      { kind: 'semester', value: semester },
    ])
  }

  const breadcrumbAncestors = useMemo<BreadcrumbItem[]>(() => {
    if (depth === 0) return []

    const ancestors: BreadcrumbItem[] = [
      { label: 'Institutions', onClick: () => popToDepth(0) },
    ]

    if (depth === 2 && selectedInstitution && selectedSemester) {
      ancestors.push({
        label: selectedInstitution.name,
        onClick: () => popToDepth(1),
      })
      ancestors.push({
        label: `${selectedSemester.academicYear} · ${selectedSemester.term}`,
        onClick: () => popToDepth(1),
      })
    }

    return ancestors
  }, [depth, popToDepth, selectedInstitution, selectedSemester])

  const currentDirectoryLabel = depth === 0
    ? 'Institutions'
    : depth === 1
      ? 'Semesters'
      : 'Modules & Grades'

  const openInstitutionForm = () => {
    setInstitutionName('')
    setInstitutionError(null)
    setIsInstitutionFormOpen(true)
  }

  const closeInstitutionForm = () => {
    if (isCreatingInstitution) return

    setInstitutionName('')
    setInstitutionError(null)
    setIsInstitutionFormOpen(false)
  }

  const createInstitution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = institutionName.trim()

    if (!sessionToken || !name) return

    setIsCreatingInstitution(true)
    setInstitutionError(null)
    setApiError(null)

    try {
      const { data, status } = await apiRequest<InstitutionResponse>(
        '/api/institutions',
        sessionToken,
        { method: 'POST', body: JSON.stringify({ name }) },
      )

      if (status !== 200) {
        throw new Error(`Unexpected institution create status (${status}).`)
      }

      setInstitutions((current) =>
        [...current, data.institution].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      )
      setInstitutionName('')
      setIsInstitutionFormOpen(false)
      showToast('Institution initialized.')
    } catch (error) {
      setInstitutionError(formatApiError(error))
    } finally {
      setIsCreatingInstitution(false)
    }
  }

  const updateModule = async (id: string, patch: Partial<Module>) => {
    if (!sessionToken) return

    setApiError(null)
    try {
      const { data, status } = await apiRequest<ModuleResponse>(
        `/api/modules/${id}`,
        sessionToken,
        { method: 'PATCH', body: JSON.stringify(patch) },
      )

      if (status !== 200) throw new Error(`Unexpected update status (${status}).`)
      setModules((current) =>
        current.map((module) => module.id === id ? data.module : module),
      )
      showToast('Module updated cleanly. Shiok—keep shipping!')
    } catch (error) {
      setApiError(formatApiError(error))
      throw error
    }
  }

  const deleteModule = async (id: string) => {
    if (!sessionToken) return

    setApiError(null)
    try {
      const { status } = await apiRequest<{ success: boolean }>(
        `/api/modules/${id}`,
        sessionToken,
        { method: 'DELETE' },
      )

      if (status !== 200) throw new Error(`Unexpected delete status (${status}).`)
      setModules((current) => current.filter((module) => module.id !== id))
      showToast('Module deleted cleanly. Shiok—keep shipping!')
    } catch (error) {
      setApiError(formatApiError(error))
      throw error
    }
  }

  return (
    <div className="app-shell bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main id="top">
        <section
          className="dashboard-section min-h-[calc(100vh-72px)] border-slate-200 bg-slate-50 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
          id="dashboard"
        >
          <div className="mx-auto w-full max-w-7xl">
            <header className="flex flex-row justify-between items-end w-full mb-6">
              <div className="flex flex-col gap-2 justify-start">
                <Breadcrumbs
                  ancestors={breadcrumbAncestors}
                  current={currentDirectoryLabel}
                />
                <h1 className="m-0 text-3xl leading-tight font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {depth === 0
                    ? 'Academic Institutions'
                    : depth === 1
                      ? `${selectedInstitution?.name ?? ''} Semesters`
                      : 'Build Overview'}
                </h1>
              </div>
              {depth === 0 && institutions.length > 0 && !isLoading ? (
                <button
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-600 px-3.5 text-xs font-bold text-white shadow-[3px_3px_0_#a9c7ff] transition-colors hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                  type="button"
                  onClick={openInstitutionForm}
                >
                  <span aria-hidden="true">+</span> New
                </button>
              ) : depth === 2 && selectedSemester ? (
                <div className="branch-badge">
                  <span aria-hidden="true">⑂</span>
                  <div>
                    <small>CURRENT TERM</small>
                    <strong>{semesterLabel}</strong>
                  </div>
                </div>
              ) : null}
            </header>

          {apiError ? (
            <p
              className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {apiError}
            </p>
          ) : null}

          {depth === 0 ? (
            <section className="workspace-panel mt-6 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" aria-label="Institutions">
              {isLoading ? (
                <div className="empty-state"><p>Loading institutions…</p></div>
              ) : institutions.length > 0 ? (
                institutions.map((institution) => (
                  <DirectoryButton
                    label={institution.name}
                    detail="Open semesters"
                    onClick={() => openInstitution(institution)}
                    key={institution.id}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <span>directory --empty</span>
                  <p>No institutions have been added yet.</p>
                  <button
                    className="button button--primary mt-5"
                    type="button"
                    onClick={openInstitutionForm}
                  >
                    <span aria-hidden="true">+</span> Add Institution
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {depth === 1 ? (
            selectedInstitution ? (
              <SemestersView
                institution={selectedInstitution}
                isLoading={isLoading}
                onOpenSemester={openSemester}
                onSemesterCreated={(semester) =>
                  setSemesters((current) =>
                    [...current, semester].sort((left, right) =>
                      `${right.academicYear}${right.term}`.localeCompare(
                        `${left.academicYear}${left.term}`,
                      ),
                    ),
                  )
                }
                semesters={semesters}
              />
            ) : null
          ) : null}

          {depth === 2 && selectedSemester ? (
            <ModulesView
              isLoading={isLoading}
              modules={modules}
              onDeleteModule={deleteModule}
              onModuleCreated={(module) =>
                setModules((current) =>
                  [...current, module].sort((left, right) =>
                    left.moduleCode.localeCompare(right.moduleCode),
                  ),
                )
              }
              onUpdateModule={updateModule}
              semester={selectedSemester}
            />
          ) : null}
          </div>
        </section>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>build: passing · latency: 0ms</code>
      </footer>

      {isInstitutionFormOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInstitutionForm()
          }}
        >
          <form
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            onSubmit={createInstitution}
            role="dialog"
            aria-modal="true"
            aria-labelledby="institution-form-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">academic.directory.init</span>
                <h2
                  className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100"
                  id="institution-form-title"
                >
                  Add Institution
                </h2>
              </div>
              <button
                className="inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                type="button"
                onClick={closeInstitutionForm}
                aria-label="Close add institution form"
                disabled={isCreatingInstitution}
              >
                ×
              </button>
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Institution name
              <input
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                autoFocus
                maxLength={160}
                placeholder="e.g., Kiasu Institute of Technology"
                value={institutionName}
                onChange={(event) => setInstitutionName(event.target.value)}
                disabled={isCreatingInstitution}
                required
              />
            </label>

            {institutionError ? (
              <p
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                {institutionError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="button button--ghost"
                type="button"
                onClick={closeInstitutionForm}
                disabled={isCreatingInstitution}
              >
                Cancel
              </button>
              <button
                className="button button--primary disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isCreatingInstitution || !institutionName.trim()}
              >
                {isCreatingInstitution ? 'Initializing…' : 'Initialize Institution'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
