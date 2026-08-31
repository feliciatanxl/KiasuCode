import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { apiRequest, formatApiError } from '../utils/api'
import {
  decryptMessage,
  encryptMessage,
  ensureUserKeyPair,
} from '../utils/crypto'

interface FriendInfo {
  id: string
  name: string
  photoUrl?: string | null
}

interface DecryptedMessage {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  plaintext: string
  createdAt: string
}

interface EncryptedMessageHistoryItem {
  id: string
  senderId: string
  receiverId: string
  encryptedContent: string
  createdAt: string
}

interface PrivateChatProps {
  friend: FriendInfo | null
  isOpen: boolean
  onClose: () => void
}

export function PrivateChat({
  friend,
  isOpen,
  onClose,
}: PrivateChatProps) {
  const { user } = useAuth()
  const { socket } = useSocket()

  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [friendPublicKey, setFriendPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize E2EE Keys Silently & Load Encrypted Message History
  const loadChatData = async (userId: string, friendId: string, friendName: string) => {
    setIsLoading(true)
    setError(null)
    setMessages([])

    try {
      // 1. Silently ensure local keypair exists (generate in background if missing)
      await ensureUserKeyPair(userId)

      // 2. Fetch friend's public key from backend
      const keyResponse = await apiRequest<{ publicKey: string | null; name: string }>(
        `/api/user/${friendId}/public-key`,
      )

      const pubKey = keyResponse.data.publicKey
      setFriendPublicKey(pubKey)

      // 3. Fetch encrypted message history from backend
      const historyResponse = await apiRequest<{
        messages: EncryptedMessageHistoryItem[]
      }>(`/api/messages/${friendId}`)

      // 4. Decrypt history on client device
      const decryptedList: DecryptedMessage[] = []
      for (const item of historyResponse.data.messages) {
        const plaintext = await decryptMessage(item.encryptedContent, userId)
        decryptedList.push({
          id: item.id,
          senderId: item.senderId,
          senderName: item.senderId === userId ? 'You' : friendName,
          receiverId: item.receiverId,
          plaintext,
          createdAt: item.createdAt,
        })
      }

      setMessages(decryptedList)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !friend || !user) return
    void loadChatData(user.id, friend.id, friend.name)
  }, [isOpen, friend, user])

  // Real-time Socket listener for incoming private messages
  useEffect(() => {
    if (!socket || !isOpen || !friend || !user) return

    const friendId = friend.id
    const currentUserId = user.id

    const handleIncomingPrivateMessage = async (msg: {
      id: string
      senderId: string
      senderName: string
      receiverId: string
      encryptedContent: string
      createdAt: string
    }) => {
      const isRelevant =
        (msg.senderId === friendId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === friendId)

      if (!isRelevant) return

      const plaintext = await decryptMessage(msg.encryptedContent, currentUserId)

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev

        return [
          ...prev,
          {
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderId === currentUserId ? 'You' : msg.senderName,
            receiverId: msg.receiverId,
            plaintext,
            createdAt: msg.createdAt,
          },
        ]
      })
    }

    socket.on('private_message', handleIncomingPrivateMessage)

    return () => {
      socket.off('private_message', handleIncomingPrivateMessage)
    }
  }, [socket, isOpen, friend, user])

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = inputMessage.trim()
    if (!text || !friend || !user || isSending) return

    if (!friendPublicKey) {
      setError(`${friend.name} has not registered an E2EE public key yet.`)
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const encryptedContent = await encryptMessage(text, friendPublicKey)

      if (socket && socket.connected) {
        socket.emit('send_private_message', {
          receiverId: friend.id,
          encryptedContent,
        })
      } else {
        throw new Error('Chat socket is currently disconnected. Please reconnect.')
      }

      const tempMessage: DecryptedMessage = {
        id: `temp_${Date.now()}`,
        senderId: user.id,
        senderName: 'You',
        receiverId: friend.id,
        plaintext: text,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempMessage])
      setInputMessage('')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen || !friend) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl flex flex-col h-[600px] max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-blue-600 font-bold text-white flex items-center justify-center shrink-0">
              {friend.photoUrl ? (
                <img
                  src={friend.photoUrl}
                  alt={friend.name}
                  className="size-full rounded-xl object-cover"
                />
              ) : (
                friend.name[0]?.toUpperCase() || '?'
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {friend.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>E2EE 1-1 Channel</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 hidden sm:inline-block"
              title="Zero-Knowledge Server: Messages are encrypted in your browser and cannot be read by anyone else."
            >
              🔒 RSA-OAEP / AES-256
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* E2EE BANNER */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2 border-b border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>🛡️</span>
          <span>
            <strong>Zero-Knowledge E2EE</strong>: Plaintext never touches the server. Only your devices hold the decryption keys.
          </span>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/30">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <div className="size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Initializing secure E2EE channel…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <span className="text-3xl">🔐</span>
              <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                End-to-End Encrypted Session Initialized
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Send your first secure private message to {friend.name}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.plaintext}</p>
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400 px-1 font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* INPUT FOOTER */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              friendPublicKey
                ? `Type secure message to ${friend.name}…`
                : 'Waiting for friend public key…'
            }
            disabled={isLoading || !friendPublicKey || isSending}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !friendPublicKey || isSending}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            <span>🔒</span>
            <span>{isSending ? 'Encrypting…' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
