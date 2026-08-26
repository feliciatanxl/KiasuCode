import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)

  // Settings states
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramReminders, setTelegramReminders] = useState(true)
  const [gpaGoalAlerts, setGpaGoalAlerts] = useState(true)
  const [gradingScale, setGradingScale] = useState('5.0')
  const [defaultTerm, setDefaultTerm] = useState('Semester 1')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Preferences saved successfully.')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">
                Dashboard
              </Link>
              <span>/</span>
              <span>Preferences</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Application Settings
            </h1>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSave} className="grid gap-6">
          {/* Appearance Section */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Appearance & Theme
              </h2>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Interface Theme
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between dark engineering mode and light documentation mode.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <span>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notification Preferences
              </h2>
            </div>

            <div className="divide-y divide-slate-100 p-6 dark:divide-slate-700/50">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Email Notifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receive weekly academic build summaries and grade milestone reports.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Telegram Reminders
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Get automated reminders in your Telegram chat before module finals and milestones.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={telegramReminders}
                  onChange={(e) => setTelegramReminders(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    GPA Target Alerts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notify when module target grade predictions impact overall CAP/GPA standing.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={gpaGoalAlerts}
                  onChange={(e) => setGpaGoalAlerts(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </div>
          </section>

          {/* Academic Calculation Defaults */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Academic Configuration
              </h2>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Default Grading Scale
                </label>
                <select
                  value={gradingScale}
                  onChange={(e) => setGradingScale(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="5.0">5.0 Scale (NUS / NTU / SIT)</option>
                  <option value="4.0">4.0 Scale (SMU / SUTD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Default Semester Term
                </label>
                <select
                  value={defaultTerm}
                  onChange={(e) => setDefaultTerm(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Special Term 1">Special Term 1</option>
                  <option value="Special Term 2">Special Term 2</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </main>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
