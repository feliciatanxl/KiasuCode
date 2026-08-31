import { useEffect, useState } from 'react'

import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import { getPetConfig } from '../utils/petRoster'

export interface FriendProfileModalTarget {
  id: string
  name: string
  photoUrl?: string | null
}

interface FriendProfileData {
  user: {
    id: string
    name: string
    photoUrl: string | null
    createdAt: string
  }
  pet: {
    id: string
    name: string
    firstName: string
    petType: string
    hungerLevel: number
    happinessLevel: number
    level: number
  } | null
  stats: {
    totalStudyMinutes: number
    totalSessions: number
  }
}

interface FriendProfileModalProps {
  friend: FriendProfileModalTarget | null
  isOpen: boolean
  onClose: () => void
  presence?: {
    status: 'online' | 'offline'
    roomId?: string | null
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function FriendProfileModal({
  friend,
  isOpen,
  onClose,
  presence,
}: FriendProfileModalProps) {
  const [profileData, setProfileData] = useState<FriendProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !friend) {
      setProfileData(null)
      setError(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    void apiRequest<FriendProfileData>(`/api/friends/${friend.id}/profile`, {
      signal: controller.signal,
    })
      .then(({ data }) => setProfileData(data))
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          setError(formatApiError(err))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [isOpen, friend])

  if (!isOpen || !friend) return null

  const displayName = profileData?.user.name || friend.name
  const photoUrl = profileData?.user.photoUrl || friend.photoUrl
  const initials = getInitials(displayName)
  const isOnline = presence?.status === 'online'
  const studyingRoom = presence?.roomId

  const pet = profileData?.pet
  const petConfig = pet ? getPetConfig(pet.petType) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-profile-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:p-7">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Student Dossier / Profile
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* PROFILE BODY */}
        <div className="mt-5 space-y-5">
          {/* USER AVATAR & PRESENCE STATUS */}
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-extrabold text-xl text-white shadow-md overflow-hidden">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="size-full rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="text-lg font-black text-slate-900 dark:text-white truncate"
                  id="friend-profile-title"
                >
                  {displayName}
                </h3>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{studyingRoom ? `Studying in #${studyingRoom}` : 'Online'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                    <span className="size-1.5 rounded-full bg-slate-400" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* COMPANION PET CARD */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Companion Pet
              </span>
              {pet && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                  Level {pet.level}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="h-16 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ) : pet && petConfig ? (
              <div className="flex items-center gap-3">
                <div className="grid size-14 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-2xl shadow-inner dark:border-blue-900/60 dark:bg-blue-950/40">
                  {petConfig.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {pet.name}
                    </strong>
                    {pet.firstName && pet.firstName !== pet.name && (
                      <span className="text-xs text-slate-400">({pet.firstName})</span>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {petConfig.title}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>🍖 Hunger: {pet.hungerLevel}%</span>
                    <span>💖 Happiness: {pet.happinessLevel}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400">
                Companion not yet adopted.
              </div>
            )}
          </div>

          {/* STUDY STATS */}
          {profileData?.stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-700/60 dark:bg-slate-900/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total Focus Time
                </span>
                <strong className="mt-0.5 block text-base font-extrabold text-slate-900 dark:text-white">
                  {profileData.stats.totalStudyMinutes >= 60
                    ? `${(profileData.stats.totalStudyMinutes / 60).toFixed(1)} hrs`
                    : `${profileData.stats.totalStudyMinutes} mins`}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-700/60 dark:bg-slate-900/50">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Focus Sessions
                </span>
                <strong className="mt-0.5 block text-base font-extrabold text-slate-900 dark:text-white">
                  {profileData.stats.totalSessions} completed
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
