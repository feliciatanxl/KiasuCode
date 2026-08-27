import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return

    setIsSubmitting(true)
    // Simulate reset link dispatch
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 600)
  }

  return (
    <main className="auth-page !bg-slate-50 px-4 text-slate-900 transition-colors dark:!bg-slate-900 dark:text-slate-100 sm:px-6">
      <Link className="brand auth-brand" to="/" aria-label="Back to KiasuCode home">
        <Logo className="text-[20px]" />
      </Link>

      <section
        className="login-card mx-auto w-full max-w-md border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        aria-labelledby="forgot-title"
      >
        <div className="login-card__terminal-bar">
          <div className="terminal-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <code>auth/password.reset</code>
        </div>
        <div className="login-card__body">
          <span className="eyebrow">Account Recovery</span>
          <h1 className="text-slate-900 dark:text-slate-100" id="forgot-title">
            Reset Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Enter your registered email address and we will send you instructions to reset your password.
          </p>

          {isSubmitted ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold">Reset Instructions Sent</span>
              </div>
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                If an account exists for <strong className="font-semibold">{email}</strong>, you will receive an email with instructions on how to reset your password shortly.
              </p>
              <div className="mt-4">
                <Link
                  to="/login"
                  className="inline-block text-xs font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Instructions…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <div className="auth-status">
        <i /> auth service configured · <code>password recovery</code>
      </div>
    </main>
  )
}
