import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type {
  ChatMessage,
  FriendshipItem,
  RoomParticipant,
  RoomState,
  RoomTimerStatus,
  TimerCompletePayload,
} from '@kiasucode/shared'
import { FriendProfileModal } from '../components/FriendProfileModal'
import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { PrivateChat } from '../components/PrivateChat'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'

interface StudyRoomCard {
  id: string
  title: string
  category: string
  description: string
  icon: string
  badgeColor: string
  accentColor: string
}

const STUDY_ROOMS: StudyRoomCard[] = [
  {
    id: 'general',
    title: 'Campus General',
    category: 'Open Hall',
    description: 'Casual multiplayer study hall for open discussion & group focus.',
    icon: '🏫',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    accentColor: 'border-blue-200 dark:border-blue-800 hover:border-blue-400',
  },
  {
    id: 'deep-work',
    title: 'Deep Work Library',
    category: 'Silent Sprint',
    description: 'Zero distractions. Heads down, high efficiency 50-minute blocks.',
    icon: '🤫',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    accentColor: 'border-purple-200 dark:border-purple-800 hover:border-purple-400',
  },
  {
    id: 'coding-lab',
    title: 'Hackers & Coders Lab',
    category: 'Dev Sprints',
    description: 'Pair programming, algorithm grinding, and late night debugging.',
    icon: '💻',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    accentColor: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400',
  },
  {
    id: 'finals-grind',
    title: 'Finals Chiong Station',
    category: 'Intensive',
    description: 'High stakes exam crunch room. Steady pom pi pi!',
    icon: '🔥',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    accentColor: 'border-rose-200 dark:border-rose-800 hover:border-rose-400',
  },
]

const TOTAL_DURATION_SECONDS = 25 * 60

export function StudyRoom() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { socket, isConnected, presenceMap } = useSocket()
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)

  // Navigation & Room state
  const [activeTab, setActiveTab] = useState<'lobby' | 'room' | 'friends'>('lobby')
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)

  // Lobby Search & Invite Code State
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')

  // Room state
  const [timerStatus, setTimerStatus] = useState<RoomTimerStatus>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_DURATION_SECONDS)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [roomSubTab, setRoomSubTab] = useState<'buddies' | 'chat'>('buddies')
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // Friends state
  const [friends, setFriends] = useState<FriendshipItem[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendshipItem[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [friendTarget, setFriendTarget] = useState('')
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [activeChatFriend, setActiveChatFriend] = useState<{ id: string; name: string; photoUrl?: string | null } | null>(null)
  const [inspectedFriend, setInspectedFriend] = useState<{ id: string; name: string; photoUrl?: string | null } | null>(null)

  // Coin Reward celebration modal
  const [celebrationCoins, setCelebrationCoins] = useState<number | null>(null)

  // Fetch friends and requests
  const loadFriendsData = (signal?: AbortSignal) => {
    return Promise.all([
      apiRequest<{ friends: FriendshipItem[] }>('/api/friends', { signal }),
      apiRequest<{ incoming: FriendshipItem[]; outgoing: FriendshipItem[] }>(
        '/api/friends/requests',
        { signal },
      ),
    ])
      .then(([friendsRes, requestsRes]) => {
        setFriends(friendsRes.data.friends)
        setIncomingRequests(requestsRes.data.incoming)
      })
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          console.error('Failed to load friends: %o', err)
        }
      })
      .finally(() => {
        if (!signal?.aborted) {
          setIsLoadingFriends(false)
        }
      })
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadFriendsData(controller.signal)
    return () => controller.abort()
  }, [])

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (roomSubTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, roomSubTab])

  // Attach room-specific WebSocket listeners
  useEffect(() => {
    if (!socket || !currentRoom) return

    socket.emit('join_room', { roomId: currentRoom })

    const handleRoomState = (state: RoomState) => {
      if (state.roomId === currentRoom) {
        setTimerStatus(state.status)
        setRemainingSeconds(state.remainingSeconds)
        setParticipants(state.participants)
      }
    }

    const handleChatMessage = (chatMsg: ChatMessage) => {
      if (chatMsg.roomId === currentRoom) {
        setMessages((prev) => [...prev, chatMsg])
      }
    }

    const handleTimerTick = (data: { roomId: string; remainingSeconds: number; status: RoomTimerStatus }) => {
      if (data.roomId === currentRoom) {
        setRemainingSeconds(data.remainingSeconds)
        setTimerStatus(data.status)
      }
    }

    const handleTimerComplete = (payload: TimerCompletePayload) => {
      if (payload.roomId === currentRoom) {
        setCelebrationCoins(payload.coinsEarned)
        showToast(`🎉 Focus session complete! +${payload.coinsEarned} coins awarded to all participants!`)
      }
    }

    socket.on('room_state', handleRoomState)
    socket.on('chat_message', handleChatMessage)
    socket.on('timer_tick', handleTimerTick)
    socket.on('timer_complete', handleTimerComplete)

    return () => {
      socket.off('room_state', handleRoomState)
      socket.off('chat_message', handleChatMessage)
      socket.off('timer_tick', handleTimerTick)
      socket.off('timer_complete', handleTimerComplete)
      socket.emit('leave_room', { roomId: currentRoom })
    }
  }, [socket, currentRoom, showToast])

  // Join room helper
  const handleJoinRoom = (roomId: string) => {
    const cleanRoomId = roomId.trim().toLowerCase()
    if (!cleanRoomId) return

    if (currentRoom !== cleanRoomId) {
      setCurrentRoom(cleanRoomId)
      setMessages([])
      setParticipants([])
      setRemainingSeconds(TOTAL_DURATION_SECONDS)
      setTimerStatus('idle')
    }
    setActiveTab('room')
  }

  // Leave room helper
  const handleLeaveRoom = () => {
    if (currentRoom && socket) {
      socket.emit('leave_room', { roomId: currentRoom })
    }
    setCurrentRoom(null)
    setMessages([])
    setParticipants([])
    setTimerStatus('idle')
    setRemainingSeconds(TOTAL_DURATION_SECONDS)
    setActiveTab('lobby')
  }

  // Create custom room
  const handleCreateCustomRoom = () => {
    const customCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    handleJoinRoom(customCode)
    showToast(`✨ Custom room created! Share code: ${customCode}`)
  }

  // Join via Invite Code form
  const handleJoinByCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanCode = inviteCodeInput.trim().toUpperCase()
    if (!cleanCode) return
    setInviteCodeInput('')
    handleJoinRoom(cleanCode)
  }

  // Timer controls
  const handleStartTimer = () => {
    if (!currentRoom || !socket) return
    socket.emit('timer_start', { roomId: currentRoom })
  }

  const handleResetTimer = () => {
    if (!currentRoom || !socket) return
    socket.emit('timer_reset', { roomId: currentRoom })
  }

  // Chat actions
  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputMessage.trim() || !isConnected || !currentRoom || !socket) return

    socket.emit('send_message', {
      roomId: currentRoom,
      message: inputMessage.trim(),
    })
    setInputMessage('')
  }

  // Friend actions
  const handleSendFriendRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!friendTarget.trim()) return

    setIsSendingRequest(true)
    setFriendError(null)

    try {
      const response = await apiRequest<{ success: boolean; message: string }>('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target: friendTarget.trim() }),
      })

      showToast(response.data.message || 'Friend request sent successfully!')
      setFriendTarget('')
      void loadFriendsData()
    } catch (err) {
      setFriendError(formatApiError(err))
    } finally {
      setIsSendingRequest(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiRequest<{ success: boolean }>(`/api/friends/${requestId}/accept`, {
        method: 'POST',
      })
      showToast('Friend request accepted!')
      void loadFriendsData()
    } catch (err) {
      showToast(formatApiError(err), 'error')
    }
  }

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    try {
      await apiRequest<{ success: boolean }>(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      })
      showToast(`Removed ${name}.`)
      void loadFriendsData()
    } catch (err) {
      showToast(formatApiError(err), 'error')
    }
  }

  // Filtered rooms in Lobby
  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return STUDY_ROOMS
    return STUDY_ROOMS.filter(
      (room) =>
        room.title.toLowerCase().includes(query) ||
        room.category.toLowerCase().includes(query) ||
        room.description.toLowerCase().includes(query),
    )
  }, [searchQuery])

  // Current Room metadata
  const currentRoomInfo = useMemo(() => {
    if (!currentRoom) return null
    return (
      STUDY_ROOMS.find((r) => r.id === currentRoom) ?? {
        id: currentRoom,
        title: `Room #${currentRoom.toUpperCase()}`,
        category: 'Custom Room',
        description: 'Private custom study room.',
        icon: '🔒',
        badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
        accentColor: 'border-indigo-200 dark:border-indigo-800',
      }
    )
  }, [currentRoom])

  // Format timer values
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const progressPercent = Math.max(
    0,
    Math.min(100, ((TOTAL_DURATION_SECONDS - remainingSeconds) / TOTAL_DURATION_SECONDS) * 100),
  )
  const radius = 78
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  // Friend IDs set for easy lookup
  const friendIdSet = useMemo(() => {
    return new Set(friends.map((f) => f.friend.id))
  }, [friends])

  return (
    <div className="app-shell bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* RECONNECTION BANNER */}
        {!isConnected && (
          <div
            className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 animate-ping rounded-full bg-amber-500" />
              <span>Connecting to multiplayer study server…</span>
            </div>
            <code className="text-xs font-mono">ws/study-hub</code>
          </div>
        )}

        {/* HEADER & TOP TOGGLE BUTTONS (Only Lobby & Friends) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow">multiplayer/social.sync</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                <i className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isConnected ? 'LIVE SYNC' : 'CONNECTING'}
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Multiplayer Study Hub
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Join synchronized 25-minute Pomodoro study sprints with friends and earn 25 coins together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('lobby')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === 'lobby'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Lobby
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              className={`relative rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Friends ({friends.length})
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] font-black text-white">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 1. LOBBY VIEW */}
        {activeTab === 'lobby' && (
          <div className="space-y-8">
            {/* LOBBY CONTROLS: SEARCH, CREATE CUSTOM ROOM, JOIN VIA CODE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              {/* Search Bar */}
              <div className="lg:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Search Study Rooms
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by room name or topic…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>
              </div>

              {/* Join via Code */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Join with Invite Code
                </label>
                <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 6-CHAR CODE"
                    maxLength={10}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!inviteCodeInput.trim()}
                    className="button button--primary h-10 px-4 text-xs font-bold disabled:opacity-50"
                  >
                    Join
                  </button>
                </form>
              </div>

              {/* Create Custom Room */}
              <div className="lg:col-span-3 flex flex-col justify-end">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Custom Sprint
                </label>
                <button
                  type="button"
                  onClick={handleCreateCustomRoom}
                  className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>✨</span> Create Custom Room
                </button>
              </div>
            </div>

            {/* ROOMS GRID */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Featured Study Sprints
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'} available
                </span>
              </div>

              {filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredRooms.map((room) => {
                    const isCurrent = currentRoom === room.id
                    return (
                      <div
                        key={room.id}
                        className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-800 transition-all hover:shadow-md ${room.accentColor} ${
                          isCurrent ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl" role="img" aria-label={room.title}>
                              {room.icon}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${room.badgeColor}`}
                            >
                              {room.category}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {room.title}
                          </h3>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {room.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-3">
                            <span className="flex items-center gap-1">
                              <i className="size-1.5 rounded-full bg-emerald-500" /> 25m Synchronized
                            </span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              +25 🪙
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleJoinRoom(room.id)}
                            className={`w-full rounded-xl py-2.5 px-4 text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-600 dark:hover:text-white'
                            }`}
                          >
                            {isCurrent ? 'Enter Active Room →' : 'Join Room →'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-3xl">🔍</span>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No study rooms found</h3>
                  <p className="mt-1 text-xs text-slate-400">No rooms matched "{searchQuery}". Try creating a custom room!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ACTIVE ROOM VIEW */}
        {activeTab === 'room' && currentRoom && currentRoomInfo && (
          <div className="space-y-4">
            {/* ROOM HEADER WITH LEAVE ROOM & INVITE CODE */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-2xl px-5 py-3.5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentRoomInfo.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {currentRoomInfo.title}
                    </h2>
                    <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {currentRoomInfo.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Synchronized study sprint</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Invite Code Share Pill */}
                <div className="flex h-9 items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 px-3.5 py-1.5 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Invite Code:</span>
                  <span className="font-mono font-black text-xs text-blue-900 dark:text-blue-200 uppercase tracking-widest">
                    {currentRoom}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentRoom.toUpperCase())
                      showToast(`📋 Room code "${currentRoom.toUpperCase()}" copied to clipboard!`)
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold ml-1 transition-colors"
                    title="Copy invite code"
                  >
                    Copy
                  </button>
                </div>

                {/* Exit Room Button */}
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 px-3.5 py-1.5 text-xs font-bold transition-colors shadow-sm whitespace-nowrap shrink-0"
                >
                  <span>🚪</span> Leave Room
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
              {/* SYNCHRONIZED TIMER CARD */}
              <section
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-12"
                aria-labelledby="timer-heading"
              >
                <span className="eyebrow" id="timer-heading">room/{currentRoom} · synchronized</span>

                {/* CIRCULAR PROGRESS */}
                <div className="relative my-8 size-64 sm:size-72">
                  <svg className="size-full -rotate-90" viewBox="0 0 180 180" aria-hidden="true">
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-100 dark:text-slate-700"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className={`transition-all duration-1000 ${
                        timerStatus === 'running'
                          ? 'text-blue-600 dark:text-blue-400'
                          : timerStatus === 'completed'
                            ? 'text-emerald-500'
                            : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-5xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl">
                      {formattedTime}
                    </span>
                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        timerStatus === 'running'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : timerStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {timerStatus === 'running' ? 'Focus Session Active' : timerStatus === 'completed' ? 'Completed!' : 'Ready to Start'}
                    </span>
                  </div>
                </div>

                {/* CONTROLS */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {timerStatus !== 'running' ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      disabled={!isConnected}
                      className="button button--primary button--large disabled:opacity-50"
                    >
                      <span aria-hidden="true">▶</span> Start Group Pomodoro
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetTimer}
                      disabled={!isConnected}
                      className="button button--ghost button--large"
                    >
                      Reset Timer
                    </button>
                  )}
                </div>

                <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                  All connected participants in room <strong>#{currentRoom}</strong> share this clock.
                </p>
              </section>

              {/* RIGHT PANEL: PARTICIPANTS & LIVE ROOM CHAT */}
              <section
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 h-[560px]"
                aria-labelledby="room-panel-heading"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomSubTab('buddies')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        roomSubTab === 'buddies'
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Buddies ({participants.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomSubTab('chat')}
                      className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        roomSubTab === 'chat'
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      💬 Live Chat ({messages.length})
                    </button>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <i className="size-1.5 rounded-full bg-emerald-500" /> WSS
                  </span>
                </div>

                {roomSubTab === 'buddies' ? (
                  /* BUDDIES LIST */
                  <div className="flex-1 flex flex-col min-h-0 pt-2">
                    <div className="flex-1 overflow-y-auto pr-1">
                      {participants.length > 0 ? (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700/60" role="list">
                          {participants.map((participant) => {
                            const isFriend = friendIdSet.has(participant.userId)
                            const isSelf = participant.userId === user?.id

                            return (
                              <li key={participant.userId} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="relative">
                                    {participant.photoUrl ? (
                                      <img
                                        src={participant.photoUrl}
                                        alt=""
                                        className="size-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                      />
                                    ) : (
                                      <div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                        {participant.name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <span
                                      className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800"
                                      aria-label="Online"
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate block">
                                        {participant.name}
                                      </span>
                                      {isSelf && (
                                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                          YOU
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                      {isFriend ? '⭐ Friend' : 'Study Participant'}
                                    </span>
                                  </div>
                                </div>

                                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                  +25 🪙 on finish
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <div className="py-12 text-center text-xs text-slate-400">
                          Waiting for participants to connect…
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700/60 dark:bg-slate-900/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>🪙</span> Group Study Reward
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        When the 25-minute timer completes, every active user receives 25 study coins automatically.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* LIVE ROOM CHAT */
                  <div className="flex-1 flex flex-col min-h-0 pt-2">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {messages.length > 0 ? (
                        messages.map((msg) => {
                          const isSelf = msg.userId === user?.id
                          const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  {isSelf ? 'You' : msg.userName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {timeStr}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs break-words shadow-sm ${
                                  isSelf
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 rounded-bl-none'
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <span className="text-3xl mb-2">💬</span>
                          <p className="text-xs font-semibold">No messages in #{currentRoom} yet.</p>
                          <p className="text-[11px] mt-0.5">Send a quick encouragement to your group!</p>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={`Type a message to #${currentRoom}...`}
                        maxLength={500}
                        className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || !isConnected}
                        className="button button--primary h-10 px-4 text-xs font-bold disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* 3. FRIENDS NETWORK TAB WITH LIVE PRESENCE */}
        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* ACCEPTED FRIENDS LIST */}
            <section
              className="h-full flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              aria-labelledby="friends-heading"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" id="friends-heading">
                      Your Friend Network ({friends.length})
                    </h2>
                    <p className="text-xs text-slate-400">Live presence and quick room join</p>
                  </div>
                </div>

                <div className="mt-4">
                  {isLoadingFriends ? (
                    <div className="flex flex-col gap-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50" />
                      ))}
                    </div>
                  ) : friends.length > 0 ? (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700/60" role="list">
                      {friends.map((item) => {
                        const friendPresence = presenceMap[item.friend.id]
                        const isOnline = friendPresence?.status === 'online'
                        const activeRoomId = friendPresence?.roomId

                        return (
                          <li key={item.id} className="flex items-center justify-between py-3">
                            <button
                              type="button"
                              onClick={() => setInspectedFriend(item.friend)}
                              className="flex items-center gap-3 min-w-0 text-left hover:opacity-85 transition-opacity focus:outline-none group cursor-pointer"
                              title={`View ${item.friend.name}'s Profile & Companion`}
                            >
                              <div className="relative">
                                {item.friend.photoUrl ? (
                                  <img
                                    src={item.friend.photoUrl}
                                    alt=""
                                    className="size-10 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500/40 dark:border-slate-700 transition-all"
                                  />
                                ) : (
                                  <div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 group-hover:ring-2 group-hover:ring-blue-500/40 transition-all">
                                    {item.friend.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span
                                  className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 ${
                                    isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                  title={isOnline ? 'Online' : 'Offline'}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {item.friend.name}
                                  </strong>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isOnline
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {isOnline ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                                <small className="text-xs text-slate-400 truncate block">
                                  {activeRoomId ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                      Studying in #{activeRoomId}
                                    </span>
                                  ) : isOnline ? (
                                    'Online in study lobby'
                                  ) : (
                                    'Study buddy'
                                  )}
                                </small>
                              </div>
                            </button>

                            <div className="flex items-center gap-2">
                              {/* Open E2EE Private Chat Button */}
                              <button
                                type="button"
                                onClick={() => setActiveChatFriend(item.friend)}
                                className="rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1"
                                title="Open End-to-End Encrypted Chat"
                              >
                                <span>💬</span> Chat
                              </button>

                              {/* Quick Join Friend Button if friend is in an active room */}
                              {isOnline && activeRoomId && (
                                <button
                                  type="button"
                                  onClick={() => handleJoinRoom(activeRoomId)}
                                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors flex items-center gap-1"
                                >
                                  <span>🚀</span> Join Friend
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => void handleRemoveFriend(item.id, item.friend.name)}
                                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                title="Remove friend"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No friends added yet.</p>
                      <p className="mt-1 text-[11px] text-slate-400">Add course mates or study buddies using their username or email.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ADD FRIEND & INCOMING REQUESTS */}
            <div className="h-full flex flex-col gap-6">
              {/* SEND FRIEND REQUEST */}
              <section
                className="flex-1 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                aria-labelledby="add-friend-heading"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100" id="add-friend-heading">
                    Add Study Buddy
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">Search by student username, email, or account ID</p>

                  <form onSubmit={handleSendFriendRequest} className="mt-4 flex flex-col gap-3">
                    <input
                      type="text"
                      value={friendTarget}
                      onChange={(e) => setFriendTarget(e.target.value)}
                      placeholder="Username, student email, or Telegram handle"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      required
                    />

                    {friendError && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {friendError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingRequest || !friendTarget.trim()}
                      className="button button--primary w-full disabled:opacity-50"
                    >
                      {isSendingRequest ? 'Sending Request…' : 'Send Friend Request'}
                    </button>
                  </form>
                </div>
              </section>

              {/* INCOMING REQUESTS */}
              {incomingRequests.length > 0 && (
                <section
                  className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30"
                  aria-labelledby="requests-heading"
                >
                  <h3 className="text-base font-bold text-blue-950 dark:text-blue-100" id="requests-heading">
                    Incoming Requests ({incomingRequests.length})
                  </h3>

                  <ul className="mt-3 divide-y divide-blue-100 dark:divide-blue-900/50">
                    {incomingRequests.map((req) => (
                      <li key={req.id} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <strong className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                            {req.friend.name}
                          </strong>
                          <small className="text-[10px] text-slate-500 dark:text-slate-400">
                            Requested friend connection
                          </small>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleAcceptRequest(req.id)}
                            className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-blue-500"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveFriend(req.id, req.friend.name)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CELEBRATION MODAL */}
      {celebrationCoins !== null && (
        <div className="modal-backdrop" role="presentation" onClick={() => setCelebrationCoins(null)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-2xl dark:border-emerald-800 dark:bg-slate-800"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-5xl" role="img" aria-label="Celebration">🎉</span>
            <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              Group Sprint Complete!
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Solid focus lah! You and all active participants earned:
            </p>
            <div className="my-5 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-2xl font-mono font-black text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <span>🪙</span> +{celebrationCoins} Coins
            </div>
            <button
              type="button"
              className="button button--primary w-full"
              onClick={() => setCelebrationCoins(null)}
            >
              Shiok, Back to Room!
            </button>
          </div>
        </div>
      )}

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>multiplayer · Singapore</code>
      </footer>

      <PrivateChat
        friend={activeChatFriend}
        isOpen={Boolean(activeChatFriend)}
        onClose={() => setActiveChatFriend(null)}
      />

      <FriendProfileModal
        friend={inspectedFriend}
        isOpen={Boolean(inspectedFriend)}
        onClose={() => setInspectedFriend(null)}
        presence={inspectedFriend ? presenceMap[inspectedFriend.id] : undefined}
      />

      <TelegramConnectModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  )
}
