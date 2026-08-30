import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)

  // Settings states
  const [telegramReminders, setTelegramReminders] = useState(true)
  const [gradingScale, setGradingScale] = useState('UNI')
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

            <div className="divide-y divide-slate-200 dark:divide-slate-700/60">
              <div className="flex items-center justify-between gap-4 p-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Telegram Calendar Alerts
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Receive automated reminders in your Telegram chat when exams and assignment deadlines on your calendar are approaching.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telegramReminders}
                  aria-label="Telegram Calendar Alerts"
                  onClick={() => setTelegramReminders((enabled) => !enabled)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-slate-800 ${
                    telegramReminders ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      telegramReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Academic Settings Section */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Academic Settings
              </h2>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <label htmlFor="grading-scale" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Default Grading Scale
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="grading-scale"
                    value={gradingScale}
                    onChange={(e) => setGradingScale(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="UNI">5.0 Scale (NUS / NTU / SIT / SMU / SUTD)</option>
                    <option value="POLY">4.0 Scale (Polytechnics: NYP / NP / SP / TP / RP)</option>
                    <option value="ITE">4.0 Scale (Institute of Technical Education)</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>

              <div>
                <label htmlFor="default-term" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Default Semester Term
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="default-term"
                    value={defaultTerm}
                    onChange={(e) => setDefaultTerm(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Special Term 1">Special Term 1</option>
                    <option value="Special Term 2">Special Term 2</option>
                  </select>
                  <SelectChevron />
                </div>
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
