import { useState } from 'react'

import {
  isAuthUser,
  type AuthUser,
} from '../context/AuthContext'
import { getApiBaseUrl } from '../utils/api'

interface TelegramLoginOptions {
  client_id: string
  scope: Array<'profile' | 'write'>
}

interface TelegramLoginResult {
  error?: string
  id_token?: string
}

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: TelegramLoginOptions,
          callback: (result: TelegramLoginResult) => void,
        ) => void
      }
    }
  }
}

interface TelegramLoginButtonProps {
  onAuthenticated: (user: AuthUser) => void
  onError: (message: string) => void
}

interface TelegramConfigResponse {
  clientId?: string
  error?: string
}

interface TelegramAuthResponse {
  user?: unknown
  error?: string
  message?: string
}

export function TelegramLoginButton({
  onAuthenticated,
  onError,
}: TelegramLoginButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const startTelegramLogin = async () => {
    setIsSubmitting(true)

    try {
      const configResponse = await fetch(
        `${getApiBaseUrl()}/auth/telegram/config`,
        {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )
      const config = (await configResponse.json().catch(() => null)) as
        | TelegramConfigResponse
        | null

      if (!configResponse.ok || !config?.clientId) {
        throw new Error(
          config?.error || 'Telegram login is not configured on the server.',
        )
      }

      const clientId = config.clientId
      const telegramLogin = window.Telegram?.Login

      if (!telegramLogin) {
        throw new Error('Unable to load Telegram login. Please refresh and try again.')
      }

      const idToken = await new Promise<string>((resolve, reject) => {
        telegramLogin.auth(
          {
            client_id: clientId,
            scope: ['profile', 'write'],
          },
          (result) => {
            if (result.id_token) {
              resolve(result.id_token)
              return
            }

            reject(new Error(result.error || 'Telegram sign-in was cancelled.'))
          },
        )
      })
      const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'telegram',
          credential: idToken,
        }),
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

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() => void startTelegramLogin()}
      className="relative z-10 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
        {isSubmitting ? 'Completing Telegram sign-in…' : 'Continue with Telegram'}
      </span>
    </button>
  )
}
