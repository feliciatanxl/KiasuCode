import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { AcademicSemester, Institution, Module } from '@kiasucode/shared'

import { GpaDashboard } from '../components/GpaDashboard'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import {
  calculateCurrentGpa,
  calculateEarnedCredits,
  calculateTargetGpa,
  getScaleForSchool,
} from '../utils/gpa'

interface SemesterResponse {
  semester: AcademicSemester
}

interface SemestersViewProps {
  institution: Institution
  isLoading: boolean
  onOpenSemester: (semester: AcademicSemester) => void
  onSemesterCreated: (semester: AcademicSemester) => void
  semesters: AcademicSemester[]
}

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let i = -5; i <= 5; i++) {
    const startYear = currentYear + i
    const endYear = startYear + 1
    years.push(
      `AY${startYear.toString().slice(2)}/${endYear.toString().slice(2)}`,
    )
  }
  return years
}

const ITE_TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const STANDARD_TERM_OPTIONS = [
  'Semester 1',
  'Semester 2',
  'Special Term 1',
  'Special Term 2',
]

export function SemestersView({
  institution,
  isLoading,
  onOpenSemester,
  onSemesterCreated,
  semesters,
}: SemestersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false)
  const [academicYear, setAcademicYear] = useState('')
  const [term, setTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [institutionModules, setInstitutionModules] = useState<Module[]>([])
  const yearPickerRef = useRef<HTMLDivElement | null>(null)
  const { sessionToken } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()

  const currentSchoolKey = institution.name ?? 'DEFAULT'
  const schoolScale = getScaleForSchool(currentSchoolKey)

  const isITE =
    Boolean(institution?.name?.includes('ITE')) ||
    (institution as unknown as { key?: string })?.key === 'ITE'
  const academicYears = useMemo(() => generateAcademicYears(), [])
  const termOptions = isITE ? ITE_TERM_OPTIONS : STANDARD_TERM_OPTIONS

  useEffect(() => {
    if (!isYearPickerOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        yearPickerRef.current &&
        !yearPickerRef.current.contains(event.target as Node)
      ) {
        setIsYearPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isYearPickerOpen])

  useEffect(() => {
    if (!sessionToken || !institution.id) return

    const controller = new AbortController()

    void apiRequest<{ modules: Module[] }>(
      `/api/institutions/${institution.id}/modules`,
      sessionToken,
      { signal: controller.signal },
    )
      .then(({ data }) => setInstitutionModules(data.modules))
      .catch((fetchError: unknown) => {
        if (!isAbortError(fetchError)) {
          console.error(
            'Unable to load institution modules for CGPA overview.',
            fetchError,
          )
        }
      })

    return () => controller.abort()
  }, [institution.id, sessionToken])

  const cumulativeGpa = useMemo(
    () => calculateCurrentGpa(institutionModules, currentSchoolKey),
    [institutionModules, currentSchoolKey],
  )
  const targetGpa = useMemo(
    () => calculateTargetGpa(institutionModules, currentSchoolKey),
    [institutionModules, currentSchoolKey],
  )
  const earnedCredits = useMemo(
    () => calculateEarnedCredits(institutionModules),
    [institutionModules],
  )

  const openModal = () => {
    setAcademicYear('')
    setTerm('')
    setError(null)
    setIsYearPickerOpen(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setIsYearPickerOpen(false)
    setError(null)
  }

  const createSemester = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sessionToken) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { data, status } = await apiRequest<SemesterResponse>(
        '/api/semesters',
        sessionToken,
        {
          method: 'POST',
          body: JSON.stringify({
            institution_id: institution.id,
            academicYear: academicYear.trim().toUpperCase(),
            term: term.trim(),
          }),
        },
      )

      if (status !== 200) {
        throw new Error(`Unexpected semester create status (${status}).`)
      }

      onSemesterCreated(data.semester)
      setIsModalOpen(false)
      setIsYearPickerOpen(false)
      showToast('Semester initialized.')
    } catch (submitError) {
      setError(formatApiError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <GpaDashboard
        currentGpa={cumulativeGpa}
        earnedCredits={earnedCredits}
        targetGpa={targetGpa}
        modules={institutionModules}
        gpaLabel="Cumulative GPA"
        maxScale={schoolScale.max}
      />

      <section
        className="workspace-panel mt-6 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        aria-labelledby="semester-directory-title"
        data-theme={theme}
      >
        <div className="panel-heading border-slate-200 dark:border-slate-700">
          <div>
            <span className="eyebrow">{institution.name}</span>
            <h2
              className="text-slate-900 dark:text-slate-100"
              id="semester-directory-title"
            >
              Semester Directory
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Open a term to manage its modules and grades.
            </p>
          </div>
          {semesters.length > 0 && !isLoading ? (
            <button
              className="button button--primary"
              type="button"
              onClick={openModal}
            >
              <span aria-hidden="true">+</span> New
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="empty-state">
            <p>Loading semesters…</p>
          </div>
        ) : semesters.length > 0 ? (
          semesters.map((semester) => (
            <button
              className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
              type="button"
              onClick={() => onOpenSemester(semester)}
              key={semester.id}
            >
              <span>
                <strong className="block text-sm text-slate-900 dark:text-slate-100">
                  {semester.academicYear} · {semester.term}
                </strong>
                <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Open modules and grades
                </small>
              </span>
              <span className="text-xl text-blue-500" aria-hidden="true">
                →
              </span>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <span>directory --empty</span>
            <p>No semesters have been added for this institution.</p>
            <button
              className="button button--primary mt-5"
              type="button"
              onClick={openModal}
            >
              <span aria-hidden="true">+</span> Add Semester
            </button>
          </div>
        )}
      </section>

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
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            onSubmit={createSemester}
            role="dialog"
            aria-modal="true"
            aria-labelledby="semester-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">semester.branch.init</span>
                <h2
                  className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100"
                  id="semester-modal-title"
                >
                  Add Semester
                </h2>
              </div>
              <button
                className="inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                type="button"
                onClick={closeModal}
                aria-label="Close add semester form"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Academic Year
                <div className="relative mt-2" ref={yearPickerRef}>
                  <button
                    className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                    type="button"
                    onClick={() => setIsYearPickerOpen((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-haspopup="listbox"
                    aria-expanded={isYearPickerOpen}
                  >
                    {academicYear ? (
                      <span className="font-medium text-slate-900 dark:text-white">
                        {academicYear}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        Select academic year...
                      </span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`size-4 text-slate-400 transition-transform ${isYearPickerOpen ? 'rotate-180 text-blue-500' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isYearPickerOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                      <div className="custom-scrollbar grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
                        {academicYears.map((ay) => {
                          const isSelected = academicYear === ay
                          return (
                            <button
                              className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm transition-colors ${
                                isSelected
                                  ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                              }`}
                              key={ay}
                              type="button"
                              onClick={() => {
                                setAcademicYear(ay)
                                setIsYearPickerOpen(false)
                              }}
                            >
                              {ay}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Term
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="" disabled>
                    Select term...
                  </option>
                  {termOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? (
              <p
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="button button--ghost"
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="button button--primary disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting || !academicYear.trim() || !term.trim()}
              >
                {isSubmitting ? 'Initializing…' : 'Initialize Semester'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
