import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type {
  FriendshipItem,
  RoomParticipant,
  RoomState,
  RoomTimerStatus,
  TimerCompletePayload,
} from '@kiasucode/shared'
import { io, type Socket } from 'socket.io-client'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, getApiBaseUrl, isAbortError } from '../utils/api'

const DEFAULT_ROOM_ID = 'general'
const TOTAL_DURATION_SECONDS = 25 * 60

export function StudyRoom() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [roomId] = useState(DEFAULT_ROOM_ID)

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Room state
  const [timerStatus, setTimerStatus] = useState<RoomTimerStatus>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_DURATION_SECONDS)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])

  // Friends state
  const [friends, setFriends] = useState<FriendshipItem[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendshipItem[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [friendTarget, setFriendTarget] = useState('')
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'room' | 'friends'>('room')

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
          console.error('Failed to load friends:', err)
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


  // Setup WebSocket connection
  useEffect(() => {
    const socket = io(getApiBaseUrl(), {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setIsReconnecting(false)
      socket.emit('join_room', { roomId })
    })

    socket.on('connect_error', () => {
      setIsConnected(false)
      setIsReconnecting(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('room_state', (state: RoomState) => {
      setTimerStatus(state.status)
      setRemainingSeconds(state.remainingSeconds)
      setParticipants(state.participants)
    })

    socket.on('timer_tick', (data: { remainingSeconds: number; status: RoomTimerStatus }) => {
      setRemainingSeconds(data.remainingSeconds)
      setTimerStatus(data.status)
    })

    socket.on('timer_complete', (payload: TimerCompletePayload) => {
      setCelebrationCoins(payload.coinsEarned)
      showToast(`🎉 Focus session complete! +${payload.coinsEarned} coins awarded to all participants!`)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, showToast])

  // Timer controls
  const handleStartTimer = () => {
    socketRef.current?.emit('timer_start', { roomId })
  }

  const handleResetTimer = () => {
    socketRef.current?.emit('timer_reset', { roomId })
  }

  // Friend actions
  const handleSendFriendRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!friendTarget.trim()) return

    setIsSendingRequest(true)
    setFriendError(null)

    try {
      await apiRequest<{ success: boolean; message: string }>('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target: friendTarget.trim() }),
      })

      showToast('Friend request sent successfully!')
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
              <span>{isReconnecting ? 'Reconnecting to multiplayer study room…' : 'Connecting to study server…'}</span>
            </div>
            <code className="text-xs font-mono">ws/study-hub</code>
          </div>
        )}

        {/* HEADER */}
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
              Multiplayer Study Room
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Synchronize 25-minute Pomodoro study sprints with friends and earn 25 coins together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('room')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === 'room'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Study Room ({participants.length})
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

        {/* MAIN GRID */}
        {activeTab === 'room' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            {/* SYNCHRONIZED TIMER CARD */}
            <section
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-12"
              aria-labelledby="timer-heading"
            >
              <span className="eyebrow" id="timer-heading">room/{roomId} · synchronized</span>

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
                All connected participants in room <strong>#{roomId}</strong> share this clock.
              </p>
            </section>

            {/* ROOM PARTICIPANTS CARD */}
            <section
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              aria-labelledby="participants-heading"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100" id="participants-heading">
                    Active Study Buddies ({participants.length})
                  </h2>
                  <p className="text-xs text-slate-400">Currently in this room</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <i className="size-1.5 rounded-full bg-emerald-500" /> SYNCED
                </span>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto">
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
            </section>
          </div>
        ) : (
          /* FRIENDS NETWORK TAB */
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
                    <p className="text-xs text-slate-400">Connect and study together</p>
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
                      {friends.map((item) => (
                        <li key={item.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.friend.photoUrl ? (
                              <img
                                src={item.friend.photoUrl}
                                alt=""
                                className="size-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                {item.friend.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <strong className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                {item.friend.name}
                              </strong>
                              <small className="text-xs text-slate-400">{item.friend.email || 'Telegram user'}</small>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleRemoveFriend(item.id, item.friend.name)}
                            className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                            title="Remove friend"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No friends added yet.</p>
                      <p className="mt-1 text-[11px] text-slate-400">Add course mates or study buddies using their email or username.</p>
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
                  <p className="mt-1 text-xs text-slate-400">Search by student email, name, or account ID</p>

                  <form onSubmit={handleSendFriendRequest} className="mt-4 flex flex-col gap-3">
                    <input
                      type="text"
                      value={friendTarget}
                      onChange={(e) => setFriendTarget(e.target.value)}
                      placeholder="friend@u.nus.edu or Telegram username"
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
                            {req.friend.email || 'Requested connection'}
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

      <TelegramConnectModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  )
}
