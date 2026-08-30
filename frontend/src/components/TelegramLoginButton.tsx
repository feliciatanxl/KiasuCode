import { useEffect, useRef, useState } from 'react'

import {
  isAuthUser,
  type AuthUser,
} from '../context/AuthContext'
import { getApiBaseUrl } from '../utils/api'

export interface TelegramLoginPayload {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onKiasuCodeTelegramAuth?: (user: TelegramLoginPayload) => void
  }
}

interface TelegramLoginButtonProps {
  onAuthenticated: (user: AuthUser) => void
  onError: (message: string) => void
}

interface TelegramAuthResponse {
  user?: unknown
  error?: string
  message?: string
}

const telegramBotName = (
  import.meta.env.VITE_TELEGRAM_BOT_NAME?.trim() || 'KiasuCodeBot'
).replace(/^@/, '')


export function TelegramLoginButton({
  onAuthenticated,
  onError,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const container = containerRef.current

    if (!container || !telegramBotName) return

    const handleTelegramAuth = async (payload: TelegramLoginPayload) => {
      setIsSubmitting(true)

      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/telegram`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const body = (await response.json().catch(() => null)) as
          | TelegramAuthResponse
          | null

        if (!response.ok) {
          throw new Error(
            body?.message
            || body?.error
            || `Telegram sign-in failed (${response.status}).`,
          )
        }

        if (!isAuthUser(body?.user)) {
          throw new Error('Telegram returned an invalid authentication session.')
        }

        onAuthenticated(body.user)
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : 'Unable to complete Telegram sign-in.',
        )
      } finally {
        setIsSubmitting(false)
      }
    }

    window.onKiasuCodeTelegramAuth = (payload) => {
      void handleTelegramAuth(payload)
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', telegramBotName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute(
      'data-onauth',
      'window.onKiasuCodeTelegramAuth(user)',
    )
    script.addEventListener('error', () => {
      onError('Unable to load the Telegram Login Widget.')
    })
    container.replaceChildren(script)

    return () => {
      container.replaceChildren()
      delete window.onKiasuCodeTelegramAuth
    }
  }, [onAuthenticated, onError])

  if (!telegramBotName) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Telegram login is unavailable until VITE_TELEGRAM_BOT_NAME is configured.
      </p>
    )
  }

  return (
    <div className="relative min-h-10 w-full">
      <div
        className={`flex min-h-10 w-full justify-center transition-opacity ${
          isSubmitting ? 'pointer-events-none opacity-50' : ''
        }`}
        ref={containerRef}
        aria-busy={isSubmitting}
      />
      {isSubmitting ? (
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400" role="status">
          Verifying Telegram account…
        </p>
      ) : null}
    </div>
  )
}
