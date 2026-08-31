import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'

interface GuideSection {
  id: string
  title: string
  icon: string
  badge: string
  description: string
  features: string[]
  tip?: string
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Daily Hub & Today\'s Agenda',
    icon: '📊',
    badge: 'Core',
    description: 'Your central command center. Filter your upcoming milestones, check your active pet status, and jump straight into productivity.',
    features: [
      'Filtered milestones displaying deadlines due today or in the next few days.',
      'Live Companion Widget showing current level, XP, hunger, and coin balance.',
      'Quick action buttons to immediately deploy focus sprints or inspect modules.',
    ],
    tip: 'Keep your dashboard pinned during exam weeks for automated daily countdown tracking.',
  },
  {
    id: 'pomodoro',
    title: 'Solo Pomodoro Sprints & Coins',
    icon: '⏱️',
    badge: 'Focus',
    description: 'Structure your study blocks into high-efficiency focus sprints while earning gamified study rewards.',
    features: [
      'Customizable 25/50 min study sprints tagged to specific modules or custom tasks.',
      'Earn 1 Study Coin for every completed minute of verified focus time.',
      'Automatic recording to your personal 30-day Study Activity Heatmap.',
    ],
    tip: 'Coins earned from Pomodoro sprints are used to feed and level up your virtual pet.',
  },
  {
    id: 'pet',
    title: 'Pet Companion Gamification',
    icon: '🐣',
    badge: 'Gamification',
    description: 'Adopt and nurture a companion that grows alongside your academic achievements.',
    features: [
      'Choose from 5 starter archetypes: Kopi Penguin, Merlion Pup, Singa Lion, Otter Cadet, and Dragon Playground.',
      'Immutable first names locked to your pet\'s birth certificate.',
      'Feed your pet with study coins to increase XP and unlock companion evolutions.',
    ],
    tip: 'Consistent daily study prevents your pet\'s hunger meter from depleting!',
  },
  {
    id: 'e2ee-chat',
    title: 'Zero-Knowledge E2EE 1-1 Chat',
    icon: '🔒',
    badge: 'Security',
    description: 'Chat privately with classmates without compromising data security or academic confidentiality.',
    features: [
      'Client-side RSA-OAEP + AES-GCM-256 hybrid cryptography using browser Web Crypto API.',
      'Private keys are stored exclusively in your local browser IndexedDB and never touch the server.',
      'Real-time encrypted message routing via WebSocket socket rooms.',
    ],
    tip: 'Click the 💬 Chat button next to any online classmate in the Study Room to start an encrypted session.',
  },
  {
    id: 'study-room',
    title: 'Multiplayer Virtual Study Room',
    icon: '👥',
    badge: 'Collaboration',
    description: 'Stay accountable with real-time study presence alongside fellow students.',
    features: [
      'Join collaborative study rooms with live classmate presence indicators.',
      'Add friends and see their live active study rooms on your profile.',
      'Shared group focus timers to study synchronously.',
    ],
  },
  {
    id: 'telegram',
    title: 'Telegram Bot Reminders & OTP',
    icon: '🤖',
    badge: 'Integration',
    description: 'Seamlessly connect Telegram for automated deadline alerts and secure password recovery.',
    features: [
      'Automated background notifications 1 day and 3 days before major deadlines.',
      'Instant Telegram alerts whenever a classmate sends you a friend request.',
      '6-digit OTP verification delivered straight to your Telegram bot for secure password resets.',
    ],
    tip: 'Link your bot in Settings or through the Connect Telegram modal at any time.',
  },
]

export function GuideView() {
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const filteredSections = activeTab === 'all'
    ? guideSections
    : guideSections.filter((s) => s.id === activeTab)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* HEADER */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Documentation</span>
              <span>/</span>
              <span>Platform Manual</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              KiasuCode User Guide
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Everything you need to master your academic workflow, focus timers, encrypted chat, and pet companion.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* QUICK CATEGORY FILTER PILLS */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            All Features
          </button>
          {guideSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === section.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title.split('&')[0]}</span>
            </button>
          ))}
        </div>

        {/* GRID OF FEATURE GUIDES */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSections.map((section) => (
            <section
              key={section.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{section.icon}</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {section.badge}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {section.description}
                </p>

                <div className="mt-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Key Highlights
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                    {section.features.map((feat, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {section.tip && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                  <span className="font-bold">Pro Tip: </span>
                  {section.tip}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* BOTTOM HELP CTA */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-lg dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200">
                Ready to commit?
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Start Your Study Session Now
              </h2>
              <p className="mt-1 max-w-xl text-xs text-blue-100">
                Configure your modules on Campus, deploy your first 25-minute sprint, and watch your companion level up!
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/timer"
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Launch Pomodoro ⏱️
              </Link>
              <Link
                to="/study-room"
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Join Study Room 👥
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>guide · documentation</code>
      </footer>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
