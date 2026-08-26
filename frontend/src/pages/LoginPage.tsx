import {
  TelegramLoginButton,
  type TelegramLoginWidgetData,
} from '@advanceddev/telegram-login-react'
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

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
const authApiUrl = (
  import.meta.env.VITE_AUTH_API_URL?.trim() || 'http://localhost:3001'
).replace(/\/$/, '')

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const user = value as Partial<AuthUser>

  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    (user.provider === 'google' || user.provider === 'telegram')
  )
}

async function exchangeProviderCredential(
  request: AuthSessionRequest,
): Promise<AuthSessionResponse> {
  const response = await fetch(`${authApiUrl}/auth/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })
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
  const googleContainerRef = useRef<HTMLElement>(null)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(300)
  const [activeProvider, setActiveProvider] = useState<AuthProviderName | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

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
        navigate('/dashboard', { replace: true })
      } catch (error) {
        setAuthError(formatError(error))
      } finally {
        setActiveProvider(null)
      }
    },
    [login, navigate],
  )

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
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

  const isBusy = activeProvider !== null

  return (
    <main className="auth-page px-4 sm:px-6">
      <Link className="brand auth-brand" to="/" aria-label="Back to KiasuCode home">
        <Logo className="text-[20px]" />
      </Link>

      <section className="login-card mx-auto w-full max-w-md" aria-labelledby="login-title">
        <div className="login-card__terminal-bar">
          <div className="terminal-dots" aria-hidden="true"><span /><span /><span /></div>
          <code>auth/session.init</code>
        </div>
        <div className="login-card__body">
          <span className="eyebrow">Welcome to the repository</span>
          <h1 id="login-title">Sign in. Ship steady.</h1>
          <p>Choose a provider to continue your academic build.</p>

          <div className="auth-buttons" aria-busy={isBusy}>
            <section className="telegram-login-feature" aria-labelledby="telegram-login-title">
              <div className="telegram-login-feature__heading">
                <span className="telegram-login-feature__icon" aria-hidden="true">➤</span>
                <div>
                  <strong id="telegram-login-title">Continue with Telegram</strong>
                  <small>Best for the KiasuCode bot experience</small>
                </div>
                <em>RECOMMENDED</em>
              </div>
              <p>Sign in once, then keep your academic workflow connected in chat.</p>
              {telegramBotName ? (
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
              ) : (
                <MissingProviderButton provider="telegram" />
              )}
            </section>

            <div className="auth-divider" aria-hidden="true">
              <span>or use another account</span>
            </div>

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

          {activeProvider && (
            <p className="auth-message" role="status">
              Completing {activeProvider} sign-in…
            </p>
          )}
          {authError && (
            <p className="auth-message auth-message--error" role="alert">
              {authError}
            </p>
          )}

          <p className="auth-terms">
            Your provider credential is verified by the KiasuCode authentication service.<br />
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
