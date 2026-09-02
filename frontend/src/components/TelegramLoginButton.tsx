import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isAuthUser,
  type AuthUser,
} from '../context/AuthContext'
import { getApiBaseUrl } from '../utils/api'

interface TelegramAuthData {
  id: number | string
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number | string
  hash: string
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

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
    Telegram?: {
      Login?: {
        auth: (
          options: { client_id: string; scope: Array<'profile' | 'write'> },
          callback: (result: { error?: string; id_token?: string }) => void,
        ) => void
      }
    }
  }
}

export function TelegramLoginButton({
  onAuthenticated,
  onError,
}: TelegramLoginButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Hardcoded bot username for reliable widget rendering across environments
  const botName = 'KiasuCodeBot'

  const handleTelegramAuth = useCallback(async (authData: TelegramAuthData | string) => {
    setIsSubmitting(true)

    try {
      const payload = typeof authData === 'string'
        ? { provider: 'telegram', credential: authData }
        : { provider: 'telegram', credential: authData }

      const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as TelegramAuthResponse | null

      if (!response.ok) {
        throw new Error(
          body?.message || body?.error || `Telegram sign-in failed (${response.status}).`,
        )
      }

      if (!isAuthUser(body?.user)) {
        throw new Error('Telegram returned an invalid authentication session.')
      }

      onAuthenticated(body.user)
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Unable to complete Telegram sign-in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [onAuthenticated, onError])

  // Mount Telegram login widget script dynamically
  useEffect(() => {
    window.onTelegramAuth = (user: TelegramAuthData) => {
      void handleTelegramAuth(user)
    }

    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'false')
    // Dynamic callback function
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    container.appendChild(script)

    return () => {
      delete window.onTelegramAuth
    }
  }, [botName, handleTelegramAuth])

  // Fallback programmatic login handler
  const handleManualClick = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const telegramLogin = window.Telegram?.Login

      if (telegramLogin) {
        telegramLogin.auth(
          {
            client_id: botName,
            scope: ['profile', 'write'],
          },
          (result) => {
            if (result.id_token) {
              void handleTelegramAuth(result.id_token)
            } else if (result.error) {
              setIsSubmitting(false)
              onError(result.error)
            } else {
              setIsSubmitting(false)
            }
          },
        )
        return
      }

      throw new Error('Telegram Login widget is loading. Please click the widget button.')
    } catch (err) {
      setIsSubmitting(false)
      onError(err instanceof Error ? err.message : 'Failed to launch Telegram login.')
    }
  }

  return (
    <div className="w-full relative">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleManualClick()}
        className="relative z-10 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 overflow-hidden"
      >
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#229ED9"
            d="M21.9 3.2 18.7 20c-.2 1.2-.9 1.5-1.9.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.8l-4.8-1.5c-1.1-.3-1.1-1.1.2-1.6L20.4 3.4c.9-.3 1.7.2 1.5-.2Z"
          />
        </svg>
        <span>
          {isSubmitting ? 'Verifying Telegram…' : 'Continue with Telegram'}
        </span>

        {/* Telegram hidden widget overlay */}
        <div
          ref={containerRef}
          className="telegram-widget-container absolute inset-0 opacity-0 cursor-pointer overflow-hidden flex items-center justify-center pointer-events-auto [&>iframe]:scale-[3] [&>iframe]:cursor-pointer [&>iframe]:opacity-0"
          aria-hidden="true"
        />
      </button>

      {isSubmitting && (
        <p className="mt-2 text-center text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
          Completing Telegram authentication…
        </p>
      )}
    </div>
  )
}
