import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AuthProviderName = 'telegram' | 'google' | 'local'

export interface AuthUser {
  id: string
  name: string
  email?: string
  photoUrl?: string
  provider: AuthProviderName
}

interface AuthSession {
  user: AuthUser
  sessionToken: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  sessionToken: string | null
  login: (user: AuthUser, sessionToken: string) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
}

const AUTH_STORAGE_KEY = 'kiasucode.auth.session'
const LEGACY_AUTH_STORAGE_KEY = 'kiasucode.auth.user'

const AuthContext = createContext<AuthContextValue | null>(null)

function isAuthProvider(value: unknown): value is AuthProviderName {
  return value === 'telegram' || value === 'google' || value === 'local'
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const user = value as Partial<AuthUser>

  return (
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.name === 'string' &&
    user.name.length > 0 &&
    (user.email === undefined || typeof user.email === 'string') &&
    (user.photoUrl === undefined || typeof user.photoUrl === 'string') &&
    isAuthProvider(user.provider)
  )
}

function readStoredSession(): AuthSession | null {
  try {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedSession) {
      return null
    }

    const session = JSON.parse(storedSession) as Partial<AuthSession>

    if (!isAuthUser(session.user) || typeof session.sessionToken !== 'string') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    return session as AuthSession
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession)

  const login = useCallback((user: AuthUser, sessionToken: string) => {
    if (!sessionToken.trim()) {
      throw new Error('A non-empty session token is required to log in.')
    }

    const nextSession: AuthSession = { user, sessionToken }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    setSession(nextSession)
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    setSession(null)
  }, [])

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setSession((prev) => {
      if (!prev) return null
      const nextSession: AuthSession = { ...prev, user: updatedUser }
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      return nextSession
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      user: session?.user ?? null,
      sessionToken: session?.sessionToken ?? null,
      login,
      logout,
      updateUser,
    }),
    [login, logout, updateUser, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- Provider and hook form one public auth API.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
