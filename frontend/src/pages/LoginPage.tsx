import {
  TelegramLoginButton,
  type TelegramLoginWidgetData,
} from '@advanceddev/telegram-login-react'
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { useCallback, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Logo } from '../components/Logo'
import {
  useAuth,
  type AuthProviderName,
  type AuthUser,
} from '../context/AuthContext'

interface GoogleIdTokenClaims extends JwtPayload {
  sub: string
  email?: string
  name?: string
  given_name?: string
  picture?: string
}

interface AuthSessionResponse {
  user: AuthUser
  sessionToken: string
}

type AuthSessionRequest =
  | {
      provider: 'google'
      credential: string
      profile: AuthUser
    }
  | {
      provider: 'telegram'
      authData: TelegramLoginWidgetData
      profile: AuthUser
    }

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
const telegramBotName = import.meta.env.VITE_TELEGRAM_BOT_NAME?.trim() ?? ''

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const user = value as Partial<AuthUser>

  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    (user.provider === 'google' || user.provider === 'telegram' || user.provider === 'local')
  )
}

async function exchangeProviderCredential(
  request: AuthSessionRequest,
): Promise<AuthSessionResponse> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_AUTH_API_URL}/auth/session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(request),
      },
    )
    const body = (await response.json().catch(() => null)) as
      | (Partial<AuthSessionResponse> & { error?: string })
      | null

    if (!response.ok) {
      throw new Error(body?.error || `Authentication failed (${response.status}).`)
    }

    if (
      !body ||
      !isAuthUser(body.user) ||
      typeof body.sessionToken !== 'string' ||
      !body.sessionToken
    ) {
      throw new Error('The authentication server returned an invalid session.')
    }

    return { user: body.user, sessionToken: body.sessionToken }
  } catch (error) {
    console.error('Auth Fetch Error:', error)
    throw error
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to sign in. Please try again.'
}

function LoginPageContent() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeProvider, setActiveProvider] = useState<AuthProviderName | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromPath = (location.state as { from?: string } | null)?.from || '/dashboard'

  const completeLogin = useCallback(
    async (request: AuthSessionRequest) => {
      setActiveProvider(request.provider)
      setAuthError(null)

      try {
        const session = await exchangeProviderCredential(request)
        login(session.user, session.sessionToken)
        navigate(fromPath, { replace: true })
      } catch (error) {
        setAuthError(formatError(error))
      } finally {
        setActiveProvider(null)
      }
    },
    [login, navigate, fromPath],
  )

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLocalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setActiveProvider('local')
    setAuthError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_AUTH_API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ email, password }),
        },
      )

      const body = (await response.json().catch(() => null)) as
        | (Partial<AuthSessionResponse> & { error?: string })
        | null

      if (!response.ok) {
        throw new Error(body?.error || `Login failed (${response.status}).`)
      }

      if (
        !body ||
        !isAuthUser(body.user) ||
        typeof body.sessionToken !== 'string' ||
        !body.sessionToken
      ) {
        throw new Error('The authentication server returned an invalid session.')
      }

      login(body.user, body.sessionToken)
      navigate(fromPath, { replace: true })
    } catch (error) {
      setAuthError(formatError(error))
    } finally {
      setIsSubmitting(false)
      setActiveProvider(null)
    }
  }

  const handleGoogleSuccess = (response: CredentialResponse) => {
    try {
      if (!response.credential) {
        throw new Error('Google did not return an ID credential.')
      }

      const claims = jwtDecode<GoogleIdTokenClaims>(response.credential)

      if (!claims.sub) {
        throw new Error('Google returned a credential without a user ID.')
      }

      const profile: AuthUser = {
        id: claims.sub,
        name: claims.name || claims.given_name || claims.email || 'Google user',
        email: claims.email,
        photoUrl: claims.picture,
        provider: 'google',
      }

      void completeLogin({
        provider: 'google',
        credential: response.credential,
        profile,
      })
    } catch (error) {
      setAuthError(formatError(error))
    }
  }

  const handleTelegramSuccess = (authData: TelegramLoginWidgetData) => {
    const profile: AuthUser = {
      id: String(authData.id),
      name:
        [authData.first_name, authData.last_name].filter(Boolean).join(' ') ||
        authData.username ||
        'Telegram user',
      photoUrl: authData.photo_url,
      provider: 'telegram',
    }

    void completeLogin({ provider: 'telegram', authData, profile })
  }

  const isBusy = activeProvider !== null || isSubmitting

  return (
    <main className="auth-page !bg-slate-50 px-4 text-slate-900 transition-colors dark:!bg-slate-900 dark:text-slate-100 sm:px-6">
      <Link className="brand auth-brand" to="/" aria-label="Back to KiasuCode home">
        <Logo className="text-[20px]" />
      </Link>

      <section className="login-card mx-auto w-full max-w-md border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" aria-labelledby="login-title">
        <div className="login-card__terminal-bar">
          <div className="terminal-dots" aria-hidden="true"><span /><span /><span /></div>
          <code>auth/session.init</code>
        </div>
        <div className="login-card__body !p-8 sm:!p-10">
          <span className="eyebrow">Welcome to the repository</span>
          <h1 className="text-slate-900 dark:text-slate-100" id="login-title">Sign in. Ship steady.</h1>
          <p className="text-slate-500 dark:text-slate-400">Choose your authentication method to continue your academic build.</p>

          <form onSubmit={handleLocalSubmit} className="mt-6 flex flex-col gap-6 text-left">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@u.nus.edu"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="my-8 flex items-center">
            <hr className="flex-grow border-slate-200 dark:border-slate-700" />
            <span className="mx-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              OR CONTINUE WITH
            </span>
            <hr className="flex-grow border-slate-200 dark:border-slate-700" />
          </div>

          <div className="flex flex-col gap-3" aria-busy={isBusy}>
            {/* Google Authentication Button */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  const authUrl = `${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3000'}/api/auth/google`
                  window.location.href = authUrl
                }}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
              {googleClientId && (
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 overflow-hidden cursor-pointer">
                  <div className="w-full h-full scale-[2] origin-center opacity-0 cursor-pointer">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setAuthError('Google sign-in was cancelled or failed.')}
                      size="large"
                      width="400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Telegram Authentication Button */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  const authUrl = `${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3000'}/api/auth/telegram`
                  window.location.href = authUrl
                }}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <svg className="size-4 shrink-0 text-[#229ed9]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.07.01.25 0 .37z"/>
                </svg>
                <span>Continue with Telegram</span>
              </button>
              {telegramBotName && (
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 overflow-hidden cursor-pointer">
                  <div className="w-full h-full scale-[2] origin-center opacity-0 cursor-pointer">
                    <TelegramLoginButton
                      botUsername={telegramBotName}
                      onAuthCallback={handleTelegramSuccess}
                      requestAccess="write"
                      size="large"
                      userPic
                      lang="en"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeProvider && activeProvider !== 'local' && (
            <p className="auth-message" role="status">
              Completing {activeProvider} sign-in…
            </p>
          )}
          {authError && (
            <p className="auth-message auth-message--error" role="alert">
              {authError}
            </p>
          )}

          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>

          <p className="auth-terms mt-6">
            Your credentials are secure and verified by KiasuCode.<br />
            <span>Signing in creates a local browser session.</span>
          </p>
        </div>
      </section>

      <div className="auth-status"><i /> auth service configured · <code>secure callback</code></div>
    </main>
  )
}

export function LoginPage() {
  if (!googleClientId) {
    return <LoginPageContent />
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginPageContent />
    </GoogleOAuthProvider>
  )
}
