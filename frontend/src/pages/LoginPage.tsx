import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { useAuth, type AuthUser } from '../context/AuthContext'

type LoginProvider = 'telegram' | 'google' | 'apple'

const providerUsers: Record<LoginProvider, AuthUser> = {
  telegram: { name: 'Telegram Student', avatar: 'TS' },
  google: { name: 'Google Student', avatar: 'GS' },
  apple: { name: 'Apple Student', avatar: 'AS' },
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = (provider: LoginProvider) => {
    // TODO: Replace the Telegram placeholder with @advanceddev/telegram-login-react
    // or inject the standard Telegram Login Widget script here.
    login(providerUsers[provider])
    navigate('/dashboard', { replace: true })
  }

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

          <div className="auth-buttons">
            <button className="auth-button auth-button--telegram" type="button" onClick={() => handleLogin('telegram')}>
              <span className="auth-provider-icon">➤</span>
              Continue with Telegram
              <em>RECOMMENDED</em>
            </button>
            <button className="auth-button" type="button" onClick={() => handleLogin('google')}>
              <span className="auth-provider-icon auth-provider-icon--google">G</span>
              Continue with Google
            </button>
            <button className="auth-button auth-button--apple" type="button" onClick={() => handleLogin('apple')}>
              <span className="auth-provider-icon">●</span>
              Continue with Apple
            </button>
          </div>

          <p className="auth-terms">
            By continuing, you agree to keep calm and commit often.<br />
            <span>No real OAuth data is collected in this prototype.</span>
          </p>
        </div>
      </section>

      <div className="auth-status"><i /> auth service operational · <code>latency 0ms</code></div>
    </main>
  )
}
