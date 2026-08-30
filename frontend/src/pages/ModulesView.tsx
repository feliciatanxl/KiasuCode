import { useMemo, useState, type FormEvent } from 'react'
import type {
  AcademicSemester,
  GradeLetter,
  Institution,
  Module,
  ModuleStatus,
} from '@kiasucode/shared'

import { GpaDashboard } from '../components/GpaDashboard'
import { ModulePipeline } from '../components/ModulePipeline'

import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError } from '../utils/api'
import {
  calculateCurrentGpa,
  calculateEarnedCredits,
  calculateTargetGpa,
  getScaleForSchool,
} from '../utils/gpa'

interface ModuleResponse {
  module: Module
}

interface ModulesViewProps {
  institution?: Institution
  isLoading: boolean
  modules: Module[]
  onDeleteModule: (id: string) => Promise<void>
  onModuleCreated: (module: Module) => void
  onUpdateModule: (id: string, patch: Partial<Module>) => Promise<void>
  semester: AcademicSemester
}

const statusOptions: Array<{ label: string; value: ModuleStatus }> = [
  { label: 'Backlog', value: 'backlog' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Merged', value: 'merged' },
]

const initialDraft = {
  moduleCode: '',
  moduleName: '',
  creditUnits: 4,
  targetGrade: 'A' as GradeLetter,
  actualGrade: '' as GradeLetter | '',
  status: 'backlog' as ModuleStatus,
}

export function ModulesView({
  institution,
  isLoading,
  modules,
  onDeleteModule,
  onModuleCreated,
  onUpdateModule,
  semester,
}: ModulesViewProps) {
  const currentSchoolKey = institution?.name ?? 'DEFAULT'
  const schoolScale = getScaleForSchool(currentSchoolKey)
  const availableGrades = Object.keys(schoolScale.points)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const { showToast } = useToast()
  const semesterLabel = `${semester.academicYear} · ${semester.term}`

  const currentGpa = useMemo(
    () => calculateCurrentGpa(modules, currentSchoolKey),
    [modules, currentSchoolKey],
  )
  const targetGpa = useMemo(
    () => calculateTargetGpa(modules, currentSchoolKey),
    [modules, currentSchoolKey],
  )
  const earnedCredits = useMemo(
    () => calculateEarnedCredits(modules),
    [modules],
  )

  const openModal = () => {
    setDraft({
      ...initialDraft,
      targetGrade: (availableGrades[0] ?? 'A') as GradeLetter,
    })
    setError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setError(null)
  }

  const createModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { data, status } = await apiRequest<ModuleResponse>(
        '/api/modules',
        {
          method: 'POST',
          body: JSON.stringify({
            semester_id: semester.id,
            moduleCode: draft.moduleCode.trim().toUpperCase(),
            moduleName: draft.moduleName.trim(),
            creditUnits: draft.creditUnits,
            targetGrade: draft.targetGrade,
            actualGrade: draft.actualGrade || null,
            status: draft.status,
          }),
        },
      )

      if (status !== 200) {
        throw new Error(`Unexpected module create status (${status}).`)
      }

      onModuleCreated(data.module)
      setIsModalOpen(false)
      showToast('Module committed to branch.')
    } catch (submitError) {
      setError(formatApiError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div data-theme={theme}>
      <GpaDashboard
        currentGpa={currentGpa}
        earnedCredits={earnedCredits}
        targetGpa={targetGpa}
        modules={modules}
        gpaLabel="Term GPA"
        maxScale={schoolScale.max}
      />

      <div className="mt-6">
        {isLoading ? (
          <section className="workspace-panel border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="empty-state"><p>Loading modules…</p></div>
          </section>
        ) : (
          <ModulePipeline
            modules={modules}
            onDeleteModule={onDeleteModule}
            onRequestAdd={openModal}
            onUpdateModule={onUpdateModule}
            semester={semesterLabel}
          />
        )}
      </div>

      {isModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          data-theme={theme}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <form
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            onSubmit={createModule}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">module.commit.init</span>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100" id="module-modal-title">
                  Add Module
                </h2>
              </div>
              <button
                className="inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                type="button"
                onClick={closeModal}
                aria-label="Close add module form"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Module Code
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                  placeholder="CS2103T"
                  value={draft.moduleCode}
                  onChange={(event) => setDraft({ ...draft, moduleCode: event.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Credits (CU)
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  type="number"
                  min="0.5"
                  max="99.9"
                  step="0.5"
                  value={draft.creditUnits}
                  onChange={(event) => setDraft({ ...draft, creditUnits: Number(event.target.value) })}
                  disabled={isSubmitting}
                  required
                />
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Module Name
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Full-Stack Web Development or Data Networks"
                  value={draft.moduleName}
                  onChange={(event) => setDraft({ ...draft, moduleName: event.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Target Grade
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={draft.targetGrade}
                  onChange={(event) => setDraft({ ...draft, targetGrade: event.target.value as GradeLetter })}
                  disabled={isSubmitting}
                >
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Actual Grade
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={draft.actualGrade}
                  onChange={(event) => setDraft({ ...draft, actualGrade: event.target.value as GradeLetter | '' })}
                  disabled={isSubmitting}
                >
                  <option value="">Not graded yet</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as ModuleStatus })}
                  disabled={isSubmitting}
                >
                  {statusOptions.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button className="button button--ghost" type="button" onClick={closeModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                className="button button--primary disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting || !draft.moduleCode.trim() || !draft.moduleName.trim()}
              >
                {isSubmitting ? 'Committing…' : 'Commit Module'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
