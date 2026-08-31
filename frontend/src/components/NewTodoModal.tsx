import { useState, type FormEvent } from 'react'
import type { CreateTodoInput, TodoItem } from '@kiasucode/shared'
import { apiRequest, formatApiError } from '../utils/api'
import { useToast } from '../context/ToastContext'

interface NewTodoModalProps {
  isOpen: boolean
  onClose: () => void
  onTodoCreated: (todo: TodoItem) => void
}

interface CreateTodoResponse {
  todo: TodoItem
}

export function NewTodoModal({ isOpen, onClose, onTodoCreated }: NewTodoModalProps) {
  const [title, setTitle] = useState('')
  const [labelType, setLabelType] = useState<'Course' | 'Custom'>('Course')
  const [customLabel, setCustomLabel] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  if (!isOpen) return null

  const handleAddSubtask = () => {
    setSubtasks((prev) => [...prev, ''])
  }

  const handleSubtaskChange = (index: number, value: string) => {
    setSubtasks((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleRemoveSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setTitle('')
    setLabelType('Course')
    setCustomLabel('')
    setDescription('')
    setDeadline('')
    setSubtasks([])
    setError(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const finalLabel = labelType === 'Course' ? 'Course' : (customLabel.trim() || 'Custom')

      // Combine description and subtasks if any
      let finalDescription = description.trim()
      const validSubtasks = subtasks.filter((st) => st.trim().length > 0)
      if (validSubtasks.length > 0) {
        const subtasksText = validSubtasks.map((st) => `• [ ] ${st.trim()}`).join('\n')
        finalDescription = finalDescription
          ? `${finalDescription}\n\nSubtasks:\n${subtasksText}`
          : `Subtasks:\n${subtasksText}`
      }

      const input: CreateTodoInput = {
        title: title.trim(),
        label: finalLabel,
        description: finalDescription || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        isCompleted: false,
      }

      const { data } = await apiRequest<CreateTodoResponse>('/api/todos', {
        method: 'POST',
        body: JSON.stringify(input),
      })

      onTodoCreated(data.todo)
      showToast('To-do task created successfully!')
      resetForm()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
              task.create
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              New To-Do Item
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish CS2030 Lab 3, Revise Linear Algebra…"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              autoFocus
            />
          </div>

          {/* Label Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Label Type
              </label>
              <select
                value={labelType}
                onChange={(e) => setLabelType(e.target.value as 'Course' | 'Custom')}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="Course">📚 Course</option>
                <option value="Custom">🏷️ Custom</option>
              </select>
            </div>

            {labelType === 'Custom' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Label
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Project, CCA, Urgent"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add extra context, links, or notes..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Subto-dos
              </span>
              <button
                type="button"
                onClick={handleAddSubtask}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>+</span> Add Subto-do
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={st}
                      onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                      placeholder={`Subtask ${idx + 1}`}
                      className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="size-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove subtask"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create To-Do'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
