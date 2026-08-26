import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ToastMessage {
  id: number
  message: string
}

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message })
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="fixed right-5 bottom-5 z-[120] max-w-sm rounded-lg border border-green-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-2xl dark:border-green-800 dark:bg-slate-800 dark:text-slate-100"
          role="status"
          aria-live="polite"
          key={toast.id}
        >
          <span className="mr-2 text-green-500" aria-hidden="true">✓</span>
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
