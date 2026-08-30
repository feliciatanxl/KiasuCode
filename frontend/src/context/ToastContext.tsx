import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { setServerErrorHandler } from '../utils/api'

type ToastTone = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }, [])

  useEffect(
    () => setServerErrorHandler(({ message }) => showToast(message, 'error')),
    [showToast],
  )

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const value = useMemo(() => ({ showToast }), [showToast])
  const toastStyles = toast?.tone === 'error'
    ? 'border-red-300 dark:border-red-800'
    : toast?.tone === 'info'
      ? 'border-blue-300 dark:border-blue-800'
      : 'border-green-300 dark:border-green-800'
  const toastIcon = toast?.tone === 'error'
    ? '!'
    : toast?.tone === 'info'
      ? 'i'
      : '✓'
  const toastIconStyles = toast?.tone === 'error'
    ? 'text-red-500'
    : toast?.tone === 'info'
      ? 'text-blue-500'
      : 'text-green-500'

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className={`fixed right-5 bottom-5 z-[120] max-w-sm rounded-lg border bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-2xl dark:bg-slate-800 dark:text-slate-100 ${toastStyles}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          key={toast.id}
        >
          <span className={`mr-2 ${toastIconStyles}`} aria-hidden="true">{toastIcon}</span>
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components -- Provider and hook form one public toast API.
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }

  return context
}
