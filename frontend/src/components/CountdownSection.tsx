import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AcademicCountdown } from '@kiasucode/shared'

import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('Exam')
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const categoryOptions = useMemo(
    () => [...new Set(countdowns.map((countdown) => countdown.category))].sort(
      (left, right) => left.localeCompare(right),
    ),
    [countdowns],
  )

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

  const closeForm = () => {
    if (isSubmitting) return
    setIsFormOpen(false)
    setTitle('')
    setTargetDate('')
    setCategory('Exam')
    setEditingId(null)
    setError(null)
  }

  const openCreateForm = () => {
    if (isSubmitting) return

    setEditingId(null)
    setTitle('')
    setTargetDate('')
    setCategory('Exam')
    setError(null)
    setIsFormOpen(true)
  }

  const handleEdit = (countdown: AcademicCountdown) => {
    if (isSubmitting) return

    setEditingId(countdown.id)
    setTitle(countdown.title)
    setTargetDate(formatDateTimeLocal(countdown.targetDate))
    setCategory(countdown.category)
    setError(null)
    setIsFormOpen(true)
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
      setIsFormOpen(false)
      setTitle('')
      setTargetDate('')
      setCategory('Exam')
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

      {isFormOpen ? (
        <form className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_160px_auto]" onSubmit={createCountdown}>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Title
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              placeholder="CS2103 final exam"
              autoFocus
              required
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Target date
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              type="datetime-local"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Category
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              type="text"
              list="category-options"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={50}
              placeholder="Exam, Assignment, CCA…"
              required
            />
            <datalist id="category-options">
              {categoryOptions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button className="button button--primary flex-1" type="submit" disabled={isSubmitting || !title.trim() || !targetDate || !category.trim()}>
              {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
            </button>
            <button className="button button--ghost" type="button" onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </button>
          </div>
        </form>
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
