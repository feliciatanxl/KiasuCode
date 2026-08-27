import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'

import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useAuth, type AuthUser } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError } from '../utils/api'

interface ProfileUpdateResponse {
  success?: boolean
  user: AuthUser
}

interface SetPasswordResponse {
  success?: boolean
  message?: string
}

const maxProfileImageBytes = 2 * 1024 * 1024
const supportedProfileImageTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read the selected image.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'))
    reader.readAsDataURL(file)
  })
}

export function ProfilePage() {
  const { user, sessionToken, updateUser } = useAuth()
  const { showToast } = useToast()

  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [hasLocalPassword, setHasLocalPassword] = useState(false)

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || 'Felicia Tan')
  const [editPhotoUrl, setEditPhotoUrl] = useState(user?.photoUrl || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Set Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const displayName = user?.name || editName || 'Felicia Tan'
  const displayEmail = user?.email || 'felicia@u.nus.edu'
  const provider = user?.provider || 'local'

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const userInitials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleStartEdit = () => {
    setEditName(user?.name || 'Felicia Tan')
    setEditPhotoUrl(user?.photoUrl || '')
    setSelectedImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setProfileError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditName(user?.name || 'Felicia Tan')
    setEditPhotoUrl(user?.photoUrl || '')
    setSelectedImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setProfileError(null)
    setIsEditing(false)
  }

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!supportedProfileImageTypes.has(file.type)) {
      setProfileError('Please select a PNG, JPEG, WebP, or GIF image.')
      event.target.value = ''
      return
    }

    if (file.size > maxProfileImageBytes) {
      setProfileError('Profile pictures must be 2 MB or smaller.')
      event.target.value = ''
      return
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setProfileError(null)
  }

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedName = editName.trim()

    if (!trimmedName) {
      setProfileError('Name cannot be empty.')
      return
    }

    setIsSavingProfile(true)
    setProfileError(null)

    try {
      const nextPhotoUrl = selectedImage
        ? await fileToDataUrl(selectedImage)
        : editPhotoUrl.trim() || null

      if (sessionToken) {
        const response = await apiRequest<ProfileUpdateResponse>(
          '/api/user/profile',
          sessionToken,
          {
            method: 'PUT',
            body: JSON.stringify({
              name: trimmedName,
              photo_url: nextPhotoUrl,
            }),
          },
        )

        if (response.data.user) {
          updateUser(response.data.user)
        }
      } else if (user) {
        updateUser({
          ...user,
          name: trimmedName,
          photoUrl: nextPhotoUrl || undefined,
        })
      }

      setEditPhotoUrl(nextPhotoUrl || '')
      setSelectedImage(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast('Profile updated successfully.')
      setIsEditing(false)
    } catch (error) {
      setProfileError(formatApiError(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setIsSettingPassword(true)

    try {
      if (sessionToken) {
        await apiRequest<SetPasswordResponse>(
          '/api/auth/set-password',
          sessionToken,
          {
            method: 'POST',
            body: JSON.stringify({ password: newPassword }),
          },
        )
      }

      setHasLocalPassword(true)
      setIsPasswordModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')
      showToast('Local password configured successfully.')
    } catch (error) {
      setPasswordError(formatApiError(error))
    } finally {
      setIsSettingPassword(false)
    }
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
              <span>Account</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              User Profile
            </h1>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Personal Information Card */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Personal Information
              </h2>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="p-6">
                {profileError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {profileError}
                  </div>
                )}

                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 font-bold text-2xl text-white shadow-md">
                      {previewUrl || editPhotoUrl ? (
                        <img
                          src={previewUrl || editPhotoUrl}
                          alt={editName || displayName}
                          className="size-full rounded-2xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Change picture
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <label
                        htmlFor="profile-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                      >
                        Full Name
                      </label>
                      <input
                        id="profile-name"
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your full name"
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingProfile ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-bold text-2xl text-white shadow-md">
                  {user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={displayName}
                      className="size-full rounded-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    userInitials
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {displayName}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Active Student
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {displayEmail}
                  </p>
                  <div className="pt-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                    User ID: {user?.id || 'kc-local-user'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Connected Accounts */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Connected Authentication Providers
              </h2>
            </div>

            <div className="divide-y divide-slate-100 p-6 dark:divide-slate-700/50">
              {/* Local Credentials */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700">
                    🔑
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Local Password
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard email & password authentication
                    </p>
                  </div>
                </div>
                <div>
                  {provider === 'local' || hasLocalPassword ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {provider === 'local' ? 'Primary' : 'Configured'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordError(null)
                        setNewPassword('')
                        setConfirmPassword('')
                        setIsPasswordModalOpen(true)
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Set Password
                    </button>
                  )}
                </div>
              </div>

              {/* Telegram */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#229ed9]/10 text-[#229ed9] dark:bg-[#229ed9]/20">
                    ➤
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Telegram Bot Sync
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sync modules and query GPA directly inside Telegram
                    </p>
                  </div>
                </div>
                <div>
                  {provider === 'telegram' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsTelegramOpen(true)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Connect Telegram
                    </button>
                  )}
                </div>
              </div>

              {/* Google */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700">
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Google OAuth
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Single sign-on via Google workspace
                    </p>
                  </div>
                </div>
                <div>
                  {provider === 'google' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Not Linked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Set Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Set Local Password
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Link a local password to enable standard email and password sign-in for your account.
            </p>

            <form onSubmit={handleSetPassword} className="mt-4 space-y-4">
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {passwordError}
                </div>
              )}

              <div>
                <label
                  htmlFor="set-new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  New Password
                </label>
                <input
                  id="set-new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="set-confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Confirm Password
                </label>
                <input
                  id="set-confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSettingPassword}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettingPassword}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSettingPassword ? 'Setting Password…' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
