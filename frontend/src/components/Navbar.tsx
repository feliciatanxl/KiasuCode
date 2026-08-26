import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Logo } from './Logo'

interface NavbarProps {
  onConnectTelegram: () => void
}

export function Navbar({ onConnectTelegram }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isDarkMode = theme === 'dark'
  const userInitials = user?.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'KC'

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const handleConnectTelegram = () => {
    setIsOpen(false)
    onConnectTelegram()
  }

  const handleLogout = () => {
    setIsOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="site-header dashboard-header !grid-cols-[1fr_auto] !border-slate-200 !bg-white text-slate-900 transition-colors dark:!border-slate-700 dark:!bg-slate-900 dark:text-slate-100">
      <Link className="brand" to="/" aria-label="KiasuCode home">
        <Logo className="text-[18px]" />
      </Link>

      <div className="header-actions">
        <button
          className="theme-toggle inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          aria-pressed={isDarkMode}
          title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
          {isDarkMode ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5a8.5 8.5 0 1 0 11.9 11.9Z" />
            </svg>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            className="user-chip border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            title={user?.name}
          >
            <span>
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                userInitials
              )}
            </span>
            <div className="max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-slate-900 dark:text-white">
              {user?.name ?? 'Student'}
            </div>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className={`size-3 text-slate-500 transition-transform dark:text-slate-400 ${isOpen ? 'rotate-180' : ''}`}
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {isOpen ? (
            <div
              className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              role="menu"
              aria-label="Profile actions"
            >
              <button
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                type="button"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </button>
              <button
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                type="button"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </button>
              <button
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                type="button"
                role="menuitem"
                onClick={handleConnectTelegram}
              >
                Connect Telegram
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
              <button
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
