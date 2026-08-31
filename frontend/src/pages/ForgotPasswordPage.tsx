import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import { apiRequest, formatApiError } from '../utils/api'

interface ForgotPasswordResponse {
  success?: boolean
  message: string
  channel?: 'telegram' | 'email'
  email?: string
}

interface ResetPasswordResponse {
  success?: boolean
  message: string
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [channel, setChannel] = useState<'telegram' | 'email'>('email')
  const [infoMessage, setInfoMessage] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = identifier.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)

    try {
      const { data } = await apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed }),
      })

      setChannel(data.channel || 'email')
      setInfoMessage(data.message)
      setStep('verify')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP & set new password
  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      await apiRequest<ResetPasswordResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: identifier.trim(),
          otp: otp.trim(),
          password: newPassword,
        }),
      })

      setStep('completed')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsLoading(false)
    }
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
          <code>auth/otp.password-recovery</code>
        </div>
        <div className="login-card__body">
          <span className="eyebrow">Account Recovery</span>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-1" id="forgot-title">
            {step === 'completed'
              ? 'Password Reset Complete'
              : step === 'verify'
                ? 'Verify OTP & Reset Password'
                : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {step === 'completed'
              ? 'Your password has been successfully updated.'
              : step === 'verify'
                ? `Enter the 6-digit code sent to your ${channel === 'telegram' ? 'linked Telegram Bot' : 'email'} and choose a new password.`
                : 'Enter your registered email or username. We will send a secure 6-digit OTP to reset your password.'}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
              {error}
            </div>
          )}

          {step === 'completed' ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-bold">Password Reset Successfully</span>
              </div>
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                You can now log in with your new password on all devices.
              </p>
              <div className="mt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                >
                  Proceed to Sign In →
                </Link>
              </div>
            </div>
          ) : step === 'verify' ? (
            /* STEP 2: OTP VERIFICATION & NEW PASSWORD FORM */
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4 text-left">
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                <p className="font-semibold">{infoMessage || `OTP code sent to ${identifier}`}</p>
                <p className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  {channel === 'telegram'
                    ? 'Check your Telegram app for the instant code from KiasuCode Bot.'
                    : 'Check your email inbox and spam folder.'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="otp-code"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  6-Digit OTP Code
                </label>
                <input
                  id="otp-code"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-center text-lg font-bold tracking-widest text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6 || newPassword.length < 6}
                  className="w-full rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Verifying & Resetting…' : 'Set New Password'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Re-enter email
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    void handleRequestOtp(e as unknown as FormEvent<HTMLFormElement>)
                  }}
                  className="text-blue-600 font-semibold hover:underline dark:text-blue-400"
                >
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            /* STEP 1: REQUEST OTP FORM */
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4 text-left">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Email Address or Username
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="student@u.nus.edu or username"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Generating OTP…' : 'Send 6-Digit OTP Code'}
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
        <i /> auth service configured · <code>otp recovery</code>
      </div>
    </main>
  )
}
