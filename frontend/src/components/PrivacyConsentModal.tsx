import { useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { apiRequest, formatApiError } from '../utils/api'

interface PrivacyConsentModalProps {
  isOpen: boolean
  onConsented?: () => void
}

export function PrivacyConsentModal({ isOpen, onConsented }: PrivacyConsentModalProps) {
  const { user, updateUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAgree = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await apiRequest<{ success: boolean; user?: unknown }>(
        '/api/user/consent',
        { method: 'POST' },
      )

      if (user) {
        updateUser({
          ...user,
          hasConsented: true,
        })
      }

      onConsented?.()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-2xl dark:bg-blue-950/60">
            🛡️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Zero-Knowledge & Privacy First
            </span>
            <h2
              className="text-xl font-extrabold text-slate-900 dark:text-white"
              id="privacy-consent-title"
            >
              Privacy & Data Usage Consent
            </h2>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Welcome to KiasuCode! Before continuing to your Daily Hub, please review how we safeguard your academic journey and personal data:
        </p>

        <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs dark:border-slate-700/60 dark:bg-slate-900/50">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">🔒</span>
            <div>
              <strong className="font-semibold text-slate-900 dark:text-white block">
                End-to-End Encrypted (E2EE) 1-1 Chat
              </strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Messages with classmates are encrypted directly on your browser using RSA-OAEP & AES-256. The server never reads plaintext messages.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">⏱️</span>
            <div>
              <strong className="font-semibold text-slate-900 dark:text-white block">
                Study Logs & Academic Countdowns
              </strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Your Pomodoro sessions, milestones, and module files are stored securely to calculate streaks, heatmap statistics, and pet rewards.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">🤖</span>
            <div>
              <strong className="font-semibold text-slate-900 dark:text-white block">
                Telegram & Notification Reminders
              </strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Bot reminders and friend alerts are sent strictly when linked by you. You can disconnect at any time.
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 text-center sm:text-left">
            By clicking Agree, you accept our privacy terms.
          </span>
          <button
            type="button"
            onClick={handleAgree}
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Consent…' : 'I Agree & Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
