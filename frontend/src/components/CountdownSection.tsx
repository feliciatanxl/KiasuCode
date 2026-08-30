import { useEffect, useState, type FormEvent } from 'react'
import type {
  AcademicCountdown,
  CountdownCategory,
} from '@kiasucode/shared'

import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import { CountdownCard } from './CountdownCard'

interface CountdownsResponse {
  countdowns: AcademicCountdown[]
}

interface CountdownResponse {
  countdown: AcademicCountdown
}

const categories: CountdownCategory[] = [
  'Exam',
  'Assignment',
  'Project',
  'Personal',
]

function sortCountdowns(countdowns: AcademicCountdown[]): AcademicCountdown[] {
  return [...countdowns].sort(
    (left, right) =>
      new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime(),
  )
}

export function CountdownSection() {
  const [countdowns, setCountdowns] = useState<AcademicCountdown[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState<CountdownCategory>('Exam')
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

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
    setError(null)
  }

  const createCountdown = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !targetDate) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { data } = await apiRequest<CountdownResponse>('/api/countdowns', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          targetDate: new Date(targetDate).toISOString(),
          category,
          moduleId: null,
        }),
      })

      setCountdowns((current) => sortCountdowns([...current, data.countdown]))
      setIsFormOpen(false)
      setTitle('')
      setTargetDate('')
      setCategory('Exam')
      showToast('Academic countdown created.')
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
          onClick={() => {
            setError(null)
            setIsFormOpen(true)
          }}
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
            <select
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              value={category}
              onChange={(event) => setCategory(event.target.value as CountdownCategory)}
            >
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button className="button button--primary flex-1" type="submit" disabled={isSubmitting || !title.trim() || !targetDate}>
              {isSubmitting ? 'Saving…' : 'Save'}
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
