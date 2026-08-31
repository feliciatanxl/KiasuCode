import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Logo } from './Logo'

interface NavbarProps {
  onConnectTelegram: () => void
}

export function Navbar({ onConnectTelegram }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement
        if (!target.closest('[data-hamburger-btn]')) {
          setIsMobileMenuOpen(false)
        }
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setIsMobileMenuOpen(false)
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
    setIsMobileMenuOpen(false)
    onConnectTelegram()
  }

  const handleLogout = () => {
    setIsOpen(false)
    setIsMobileMenuOpen(false)
    void logout().finally(() => navigate('/', { replace: true }))
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link className="brand shrink-0" to="/" aria-label="KiasuCode home">
            <Logo className="text-[18px]" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/dashboard"
            >
              Dashboard
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              to="/campus"
            >
              Campus
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/files"
            >
              Module Files
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/countdowns"
            >
              Countdowns
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/timer"
            >
              Solo Timer
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/study-room"
            >
              Study Room
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
              end
              to="/pet"
            >
              My Pet
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="theme-toggle hidden size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white sm:inline-grid"
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

          {/* Profile Dropdown */}
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
              <div className="hidden max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-slate-900 dark:text-white sm:block">
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
                <Link
                  to="/profile"
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  to="/guide"
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  📖 User Guide
                </Link>
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

          {/* Hamburger menu button for mobile */}
          <button
            type="button"
            data-hamburger-btn
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
        >
          <nav className="flex flex-col space-y-1" aria-label="Mobile navigation">
            <NavLink
              to="/dashboard"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/campus"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Campus
            </NavLink>
            <NavLink
              to="/files"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Module Files
            </NavLink>
            <NavLink
              to="/countdowns"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Countdowns
            </NavLink>
            <NavLink
              to="/timer"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Solo Timer
            </NavLink>
            <NavLink
              to="/study-room"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              Study Room
            </NavLink>
            <NavLink
              to="/pet"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              My Pet
            </NavLink>
            <NavLink
              to="/guide"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              📖 User Guide
            </NavLink>

            {/* Mobile Theme Toggle item */}
            <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800 sm:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>Theme</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
