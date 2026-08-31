import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserPresence } from '@kiasucode/shared'
import { io, type Socket } from 'socket.io-client'

import { useAuth } from './AuthContext'
import { getApiBaseUrl } from '../utils/api'
import { ensureUserKeyPair } from '../utils/crypto'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  presenceMap: Record<string, { status: 'online' | 'offline'; roomId: string | null }>
  getUserPresence: (userId: string) => { status: 'online' | 'offline'; roomId: string | null }
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { status: 'online' | 'offline'; roomId: string | null }>
  >({})

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSocket(null)
      setIsConnected(false)
      setPresenceMap({})
      return
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const socketInstance = io(getApiBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      secure: isHttps,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      void ensureUserKeyPair(user.id).catch(() => undefined)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('initial_presence', (initialPresence: Record<string, { status: 'online' | 'offline'; roomId: string | null }>) => {
      setPresenceMap(initialPresence)
    })

    socketInstance.on('presence_update', (update: UserPresence) => {
      setPresenceMap((prev) => ({
        ...prev,
        [update.userId]: {
          status: update.status,
          roomId: update.roomId,
        },
      }))
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, user])

  const getUserPresence = useCallback(
    (userId: string) => {
      return presenceMap[userId] || { status: 'offline', roomId: null }
    },
    [presenceMap],
  )

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      presenceMap,
      getUserPresence,
    }),
    [socket, isConnected, presenceMap, getUserPresence],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
