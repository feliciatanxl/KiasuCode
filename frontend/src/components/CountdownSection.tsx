import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AcademicCountdown } from '@kiasucode/shared'

import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import {
  defaultCountdownColor,
  resolveCountdownColor,
} from '../utils/colors'
import { CountdownCard } from './CountdownCard'

interface CountdownsResponse {
  countdowns: AcademicCountdown[]
}

interface CountdownResponse {
  countdown: AcademicCountdown
}

interface CountdownSectionProps {
  onCountdownDeleted?: (countdownId: string) => void
  onCountdownSaved?: (countdown: AcademicCountdown) => void
}

function sortCountdowns(countdowns: AcademicCountdown[]): AcademicCountdown[] {
  return [...countdowns].sort(
    (left, right) =>
      new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime(),
  )
}

function formatDateTimeLocal(targetDate: string): string {
  const date = new Date(targetDate)
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

export function CountdownSection({
  onCountdownDeleted,
  onCountdownSaved,
}: CountdownSectionProps) {
  const [countdowns, setCountdowns] = useState<AcademicCountdown[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('Exam')
  const [color, setColor] = useState(defaultCountdownColor)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const STANDARD_CATEGORIES = ['Exam', 'Assignment', 'Project', 'Quiz', 'Lab', 'Course', 'Personal', 'CCA']

  const categoryOptions = useMemo(() => {
    const existing = countdowns
      .map((countdown) => countdown.category)
      .filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim()))

    const uniqueSet = new Set<string>()
    STANDARD_CATEGORIES.forEach((cat) => uniqueSet.add(cat))
    existing.forEach((cat) => uniqueSet.add(cat))

    return Array.from(uniqueSet)
  }, [countdowns])

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<CountdownsResponse>('/api/countdowns', {
      signal: controller.signal,
    })
      .then(({ data }) => setCountdowns(data.countdowns))
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) setError(formatApiError(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  const openCreateForm = () => {
    if (isSubmitting) return

    setEditingId(null)
    setTitle('')
    setTargetDate('')
    setCategory('Exam')
    setColor(defaultCountdownColor)
    setError(null)
    setIsModalOpen(true)
  }

  const handleEdit = (countdown: AcademicCountdown) => {
    if (isSubmitting) return

    setEditingId(countdown.id)
    setTitle(countdown.title)
    setTargetDate(formatDateTimeLocal(countdown.targetDate))
    setCategory(countdown.category)
    setColor(resolveCountdownColor(countdown.color || defaultCountdownColor))
    setError(null)
    setIsModalOpen(true)
  }

  const createCountdown = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !targetDate || !category.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const currentEditingId = editingId
      const existingCountdown = currentEditingId
        ? countdowns.find((countdown) => countdown.id === currentEditingId)
        : null
      const { data } = await apiRequest<CountdownResponse>(
        currentEditingId ? `/api/countdowns/${currentEditingId}` : '/api/countdowns',
        {
          method: currentEditingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            title: title.trim(),
            targetDate: new Date(targetDate).toISOString(),
            category: category.trim(),
            color,
            moduleId: existingCountdown?.moduleId ?? null,
          }),
        },
      )

      setCountdowns((current) => sortCountdowns(
        currentEditingId
          ? current.map((countdown) =>
              countdown.id === currentEditingId ? data.countdown : countdown,
            )
          : [...current, data.countdown],
      ))
      onCountdownSaved?.(data.countdown)
      setIsModalOpen(false)
      setTitle('')
      setTargetDate('')
      setCategory('Exam')
      setColor(defaultCountdownColor)
      setEditingId(null)
      showToast(
        currentEditingId
          ? 'Academic countdown updated.'
          : 'Academic countdown created.',
      )
    } catch (createError) {
      setError(formatApiError(createError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteCountdown = async (id: string) => {
    setDeletingId(id)
    setError(null)

    try {
      await apiRequest<{ success: true }>(`/api/countdowns/${id}`, {
        method: 'DELETE',
      })
      setCountdowns((current) => current.filter((item) => item.id !== id))
      onCountdownDeleted?.(id)
      showToast('Countdown removed.')
    } catch (deleteError) {
      setError(formatApiError(deleteError))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-slate-100/60 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:p-5" aria-labelledby="countdowns-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">daysmatter/academic</span>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white" id="countdowns-title">
            Academic Countdowns
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Keep exams, assignments, and milestones in sight.
          </p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={openCreateForm}
          disabled={isSubmitting}
        >
          <span aria-hidden="true">+</span> New Countdown
        </button>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl relative dark:border-gray-700 dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Countdown' : 'Create New Countdown'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form className="mt-4" onSubmit={createCountdown}>
              {error ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Title
                    <input
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={255}
                      placeholder="CS2103 final exam"
                      autoFocus
                      required
                    />
                  </label>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Target date
                    <input
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      type="datetime-local"
                      value={targetDate}
                      onChange={(event) => setTargetDate(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Category
                    <div className="relative mt-2">
                      <select
                        className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm font-normal normal-case tracking-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        required
                      >
                        {categoryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Color
                    <div className="mt-2 flex h-11 items-center gap-2">
                      <input
                        type="color"
                        value={resolveCountdownColor(color)}
                        onChange={(event) => setColor(event.target.value)}
                        className="h-10 w-10 cursor-pointer rounded border-0 p-0"
                        title="Pick a color"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                        className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-normal normal-case tracking-normal text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                        placeholder="#3b82f6"
                        maxLength={7}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !targetDate || !category.trim()}
                >
                  {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 flex gap-4 overflow-hidden" aria-label="Loading countdowns">
          {[0, 1, 2].map((item) => (
            <div className="h-48 min-w-[280px] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" key={item} />
          ))}
        </div>
      ) : countdowns.length > 0 ? (
        <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {countdowns.map((countdown) => (
            <CountdownCard
              countdown={countdown}
              isDeleting={deletingId === countdown.id}
              key={countdown.id}
              onDelete={deleteCountdown}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No countdowns yet.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add your next exam or submission deadline.</p>
        </div>
      )}
    </section>
  )
}
