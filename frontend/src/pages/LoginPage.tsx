import {
  TelegramLoginButton,
  type TelegramLoginWidgetData,
} from '@advanceddev/telegram-login-react'
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { useCallback, useEffect, useRef, useState } from 'react'
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

function MissingProviderButton({ provider }: { provider: AuthProviderName }) {
  const label = provider === 'telegram' ? 'bot name' : 'client ID'

  return (
    <button className="auth-button auth-button--unconfigured" type="button" disabled>
      Configure {provider} {label}
    </button>
  )
}

function LoginPageContent() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleContainerRef = useRef<HTMLElement>(null)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(300)
  const [activeProvider, setActiveProvider] = useState<AuthProviderName | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromPath = (location.state as { from?: string } | null)?.from || '/dashboard'

  useEffect(() => {
    const container = googleContainerRef.current

    if (!container) {
      return
    }

    const updateButtonWidth = () => {
      const availableWidth = Math.floor(container.clientWidth - 16)
      setGoogleButtonWidth(Math.max(200, Math.min(300, availableWidth)))
    }
    const resizeObserver = new ResizeObserver(updateButtonWidth)

    updateButtonWidth()
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

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
        <div className="login-card__body">
          <span className="eyebrow">Welcome to the repository</span>
          <h1 className="text-slate-900 dark:text-slate-100" id="login-title">Sign in. Ship steady.</h1>
          <p className="text-slate-500 dark:text-slate-400">Choose your authentication method to continue your academic build.</p>

          <form onSubmit={handleLocalSubmit} className="mt-6 space-y-4 text-left">
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
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
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
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

          <div className="my-6 flex items-center">
            <hr className="flex-grow border-slate-200 dark:border-slate-700" />
            <span className="mx-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              OR CONTINUE WITH
            </span>
            <hr className="flex-grow border-slate-200 dark:border-slate-700" />
          </div>

          <div className="auth-buttons" aria-busy={isBusy}>
            <section
              className="telegram-login-feature group relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.03] hover:ring-2 hover:ring-blue-400 hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              aria-labelledby="telegram-login-title"
            >
              <div className="telegram-login-feature__heading group-hover:animate-pulse">
                <span className="telegram-login-feature__icon" aria-hidden="true">➤</span>
                <div>
                  <strong id="telegram-login-title">Continue with Telegram</strong>
                  <small>Best for the KiasuCode bot experience</small>
                </div>
                <em>RECOMMENDED</em>
              </div>
              <p>Sign in once, then keep your academic workflow connected in chat.</p>
              {telegramBotName ? (
                <div className="absolute inset-0 z-50 flex scale-[2] items-center justify-center opacity-0">
                  <div className="oauth-widget oauth-widget--telegram">
                    <TelegramLoginButton
                      botUsername={telegramBotName}
                      onAuthCallback={handleTelegramSuccess}
                      requestAccess="write"
                      size="large"
                      userPic
                      lang="en"
                      loadingComponent={<span>Loading Telegram…</span>}
                    />
                  </div>
                </div>
              ) : (
                <MissingProviderButton provider="telegram" />
              )}
            </section>

            <section
              ref={googleContainerRef}
              className="google-login-option"
              aria-label="Google sign-in"
            >
              {googleClientId ? (
                <div className="oauth-widget oauth-widget--google">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setAuthError('Google sign-in was cancelled or failed.')}
                    size="large"
                    shape="rectangular"
                    text="continue_with"
                    theme="outline"
                    logo_alignment="left"
                    width={String(googleButtonWidth)}
                  />
                </div>
              ) : (
                <MissingProviderButton provider="google" />
              )}
            </section>
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

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Sign up
            </Link>
          </p>

          <p className="auth-terms">
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
