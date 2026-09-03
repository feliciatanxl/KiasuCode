import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CreateTodoInput, Module, TodoItem } from '@kiasucode/shared'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import { useToast } from '../context/ToastContext'

interface NewTodoModalProps {
  isOpen: boolean
  onClose: () => void
  onTodoCreated: (todo: TodoItem) => void
  onTodoUpdated?: (todo: TodoItem) => void
  initialTodo?: TodoItem | null
  existingTodos?: TodoItem[]
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6 8 4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface CreateTodoResponse {
  todo: TodoItem
}

interface ModulesResponse {
  modules: Module[]
}

function formatDateTimeLocal(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

export function NewTodoModal({
  isOpen,
  onClose,
  onTodoCreated,
  onTodoUpdated,
  initialTodo,
  existingTodos,
}: NewTodoModalProps) {
  const [title, setTitle] = useState('')
  const [labelType, setLabelType] = useState<'Course' | 'Custom'>('Course')
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false)
  const [selectedCustomLabel, setSelectedCustomLabel] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  const previousCustomLabels = useMemo(() => {
    const moduleCodes = new Set(modules.map((m) => m.moduleCode.trim().toUpperCase()))
    const rawList = (existingTodos || [])
      .map((t) => (t as any).custom_category || t.label)
      .filter((l): l is string => Boolean(l && typeof l === 'string'))
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !moduleCodes.has(l.toUpperCase()) &&
          l !== 'Course' &&
          l !== 'Custom',
      )
    return Array.from(new Set(rawList))
  }, [existingTodos, modules])

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setLabelType('Course')
      setSelectedCourse('')
      setCustomLabel('')
      setSelectedCustomLabel('')
      setIsCreatingNewLabel(false)
      setDescription('')
      setDeadline('')
      setSubtasks([])
      setError(null)
      return
    }

    if (initialTodo) {
      setTitle(initialTodo.title)
      setDeadline(initialTodo.deadline ? formatDateTimeLocal(initialTodo.deadline) : '')
      if (initialTodo.description) {
        const subtaskMatch = initialTodo.description.match(/(?:^|\n\n)Subtasks:\n([\s\S]*)$/)
        if (subtaskMatch) {
          setDescription(initialTodo.description.slice(0, subtaskMatch.index).trim())
          const parsedSubtasks = subtaskMatch[1]
            .split('\n')
            .map((line) => line.replace(/^•\s*\[[ xX]?\]\s*/, '').trim())
            .filter(Boolean)
          setSubtasks(parsedSubtasks)
        } else {
          setDescription(initialTodo.description)
          setSubtasks([])
        }
      } else {
        setDescription('')
        setSubtasks([])
      }

      if (initialTodo.label) {
        const isModule = modules.some((m) => m.moduleCode === initialTodo.label)
        if (isModule) {
          setLabelType('Course')
          setSelectedCourse(initialTodo.label)
        } else {
          setLabelType('Custom')
          if (previousCustomLabels.includes(initialTodo.label)) {
            setSelectedCustomLabel(initialTodo.label)
            setIsCreatingNewLabel(false)
          } else {
            setCustomLabel(initialTodo.label)
            setIsCreatingNewLabel(true)
          }
        }
      }
    } else {
      setTitle('')
      setLabelType('Course')
      setSelectedCourse('')
      if (previousCustomLabels.length > 0) {
        setSelectedCustomLabel(previousCustomLabels[0])
        setIsCreatingNewLabel(false)
      } else {
        setCustomLabel('')
        setIsCreatingNewLabel(true)
      }
      setDescription('')
      setDeadline('')
      setSubtasks([])
      setError(null)
    }
  }, [isOpen, initialTodo, modules, previousCustomLabels])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    setIsLoadingModules(true)

    void apiRequest<ModulesResponse>('/api/modules', { signal: controller.signal })
      .then(({ data }) => {
        const fetched = data.modules || []
        setModules(fetched)
        if (initialTodo?.label) {
          if (fetched.some((m) => m.moduleCode === initialTodo.label)) {
            setLabelType('Course')
            setSelectedCourse(initialTodo.label)
          } else {
            setLabelType('Custom')
            setCustomLabel(initialTodo.label)
          }
        }
      })
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          console.error('Failed to load modules for todo modal:', err)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingModules(false)
        }
      })

    return () => controller.abort()
  }, [isOpen, initialTodo])

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
    setSelectedCourse('')
    setCustomLabel('')
    setSelectedCustomLabel(previousCustomLabels[0] || '')
    setIsCreatingNewLabel(previousCustomLabels.length === 0)
    setDescription('')
    setDeadline('')
    setSubtasks([])
    setError(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return

    if (labelType === 'Course' && !selectedCourse) {
      showToast('Please select a course module.')
      return
    }

    if (labelType === 'Custom' && isCreatingNewLabel && !customLabel.trim()) {
      showToast('Please enter a custom label.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const finalLabel =
        labelType === 'Course'
          ? selectedCourse
          : isCreatingNewLabel
            ? customLabel.trim() || 'Custom'
            : selectedCustomLabel || 'Custom'

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
        isCompleted: initialTodo ? initialTodo.isCompleted : false,
      }

      if (initialTodo) {
        const { data } = await apiRequest<{ todo: TodoItem }>(`/api/todos/${initialTodo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
        onTodoUpdated?.(data.todo)
        showToast('To-do task updated successfully!')
      } else {
        const { data } = await apiRequest<CreateTodoResponse>('/api/todos', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        onTodoCreated(data.todo)
        showToast('To-do task created successfully!')
      }

      resetForm()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    !title.trim() ||
    (labelType === 'Course' && !selectedCourse) ||
    (labelType === 'Custom' &&
      (isCreatingNewLabel ? !customLabel.trim() : !selectedCustomLabel))

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
              {initialTodo ? 'task.edit' : 'task.create'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialTodo ? 'Edit To-Do Item' : 'New To-Do Item'}
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
              <div className="relative">
                <select
                  value={labelType}
                  onChange={(e) => setLabelType(e.target.value as 'Course' | 'Custom')}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Course">📚 Course</option>
                  <option value="Custom">🏷️ Custom</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            {labelType === 'Course' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Module
                </label>
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  >
                    <option value="" disabled>
                      Select Module
                    </option>
                    {isLoadingModules ? (
                      <option value="" disabled>
                        Loading saved modules…
                      </option>
                    ) : modules.length > 0 ? (
                      modules.map((mod) => (
                        <option key={mod.id} value={mod.moduleCode}>
                          {mod.moduleCode}
                          {mod.moduleName ? ` - ${mod.moduleName}` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No saved modules found
                      </option>
                    )}
                  </select>
                  <SelectChevron />
                </div>
              </div>
            ) : previousCustomLabels.length > 0 && !isCreatingNewLabel ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Custom Label
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewLabel(true)
                      setCustomLabel('')
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 cursor-pointer"
                  >
                    + New Label
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedCustomLabel}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_NEW__') {
                        setIsCreatingNewLabel(true)
                        setCustomLabel('')
                      } else {
                        setSelectedCustomLabel(e.target.value)
                      }
                    }}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {previousCustomLabels.map((lbl) => (
                      <option key={lbl} value={lbl}>
                        {lbl}
                      </option>
                    ))}
                    <option value="__CREATE_NEW__">+ Create New Label...</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Custom Label
                  </label>
                  {previousCustomLabels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewLabel(false)
                        setSelectedCustomLabel(previousCustomLabels[0] || '')
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 cursor-pointer"
                    >
                      ← Choose Existing
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Project, CCA, Urgent"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  autoFocus={previousCustomLabels.length > 0}
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
                <span>+</span> Add
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
              disabled={isSubmitDisabled}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {isSubmitting
                ? (initialTodo ? 'Saving…' : 'Creating…')
                : (initialTodo ? 'Save Changes' : 'Create To-Do')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
