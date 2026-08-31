import { useEffect, useState } from 'react'
import type { TodoItem } from '@kiasucode/shared'
import { apiRequest, formatApiError } from '../utils/api'
import { useToast } from '../context/ToastContext'
import { NewTodoModal } from './NewTodoModal'

interface TodosResponse {
  todos: TodoItem[]
}

interface UpdateTodoResponse {
  todo: TodoItem
}

export function TodoList({ className = '' }: { className?: string } = {}) {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { showToast } = useToast()

  const fetchTodos = async () => {
    try {
      setIsLoading(true)
      const { data } = await apiRequest<TodosResponse>('/api/todos')
      setTodos(data.todos || [])
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchTodos()
  }, [])

  const handleToggleComplete = async (todo: TodoItem) => {
    const nextCompleted = !todo.isCompleted
    setTogglingId(todo.id)

    // Optimistic update
    setTodos((prev) =>
      prev.map((item) =>
        item.id === todo.id ? { ...item, isCompleted: nextCompleted } : item,
      ),
    )

    try {
      await apiRequest<UpdateTodoResponse>(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: nextCompleted }),
      })
      if (nextCompleted) {
        showToast('Task marked as completed! 🎉')
      }
    } catch (err) {
      // Revert on error
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, isCompleted: todo.isCompleted } : item,
        ),
      )
      showToast(formatApiError(err))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const original = [...todos]
    setTodos((prev) => prev.filter((item) => item.id !== id))

    try {
      await apiRequest(`/api/todos/${id}`, {
        method: 'DELETE',
      })
      showToast('Task removed.')
    } catch (err) {
      setTodos(original)
      showToast(formatApiError(err))
    }
  }

  const handleTodoCreated = (newTodo: TodoItem) => {
    setTodos((prev) => [newTodo, ...prev])
  }

  const activeCount = todos.filter((t) => !t.isCompleted).length
  const completedCount = todos.filter((t) => t.isCompleted).length

  const filteredTodos = todos.filter((t) => {
    if (filter === 'active') return !t.isCompleted
    if (filter === 'completed') return t.isCompleted
    return true
  })

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 transition-all ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-black text-sm">
            ✓
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Action Items & To-Dos
              {activeCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {activeCount} pending
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stay ahead of submissions, labs, and study checkpoints.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
        >
          <span className="text-sm leading-none">+</span> New Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 pt-4 pb-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
          }`}
        >
          All ({todos.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            filter === 'active'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            filter === 'completed'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Todo List Content Area */}
      <div className="flex-1 flex flex-col justify-start">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            Loading tasks...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="mt-8 text-center py-2">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filter === 'completed'
                ? 'No completed tasks yet.'
                : filter === 'active'
                  ? 'All caught up! No active tasks.'
                  : 'No tasks on your radar.'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click &quot;+ New Task&quot; above to organize your academic workflow.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 max-h-96 overflow-y-auto pr-1 mt-2">
          {filteredTodos.map((todo) => {
            const isCompleted = todo.isCompleted
            const isToggling = togglingId === todo.id
            const hasDeadline = Boolean(todo.deadline)
            const deadlineDate = hasDeadline ? new Date(todo.deadline!) : null

            return (
              <li
                key={todo.id}
                onClick={() => void handleToggleComplete(todo)}
                className={`group flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isCompleted
                    ? 'border-slate-200/60 bg-slate-50/50 text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/30'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={isToggling}
                    onChange={() => {}} // Handled by container click
                    className="mt-0.5 size-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold leading-snug break-words ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {todo.title}
                      </span>
                      {todo.label && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            todo.label.toLowerCase() === 'course'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          {todo.label}
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line line-clamp-2">
                        {todo.description}
                      </p>
                    )}

                    {deadlineDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>⏰</span>
                        <span>
                          {deadlineDate.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {deadlineDate.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => void handleDelete(todo.id, e)}
                  className="opacity-0 group-hover:opacity-100 size-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all shrink-0"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  🗑️
                </button>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      {/* New Todo Modal */}
      <NewTodoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTodoCreated={handleTodoCreated}
      />
    </div>
  )
}
