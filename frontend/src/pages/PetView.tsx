import { useEffect, useState, type FormEvent } from 'react'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, isAbortError } from '../utils/api'
import {
  STARTER_PET_ROSTER,
  getPetConfig,
  type PetTypeConfig,
} from '../utils/petRoster'

interface Pet {
  id: string
  name: string
  firstName?: string
  petType?: string
  hungerLevel: number
  happinessLevel: number
  lastInteractedAt: string
}

interface PetStatusResponse {
  pet: Pet | null
  wallet: {
    coinsBalance: number
  }
}

interface FeedPetResponse {
  pet: Pet
  wallet: {
    coinsBalance: number
  }
  purchase: {
    cost: number
  }
}

interface SavePetResponse {
  pet: Pet
  wallet: {
    coinsBalance: number
  }
}

const foodCost = 20

function clampLevel(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function StatMeter({
  colorClass,
  label,
  value,
}: {
  colorClass: string
  label: string
  value: number
}) {
  const safeValue = clampLevel(value)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {safeValue}/100
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        role="progressbar"
        aria-label={`${label} level`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${colorClass}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}

export function PetView() {
  const [petStatus, setPetStatus] = useState<PetStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFeeding, setIsFeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const { showToast } = useToast()

  // Pet Customization & Adoption State
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [selectedPetType, setSelectedPetType] = useState('hatchling')
  const [permanentFirstName, setPermanentFirstName] = useState('')
  const [nickname, setNickname] = useState('')
  const [isSavingPet, setIsSavingPet] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Reset / Release Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<PetStatusResponse>('/api/pet', {
      signal: controller.signal,
    })
      .then(({ data }) => {
        setPetStatus(data)
        if (data.pet) {
          setSelectedPetType(data.pet.petType || 'hatchling')
          setPermanentFirstName(data.pet.firstName || data.pet.name)
          setNickname(data.pet.name)
        }
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) setError(formatApiError(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey])

  const retryLoad = () => {
    setError(null)
    setIsLoading(true)
    setReloadKey((key) => key + 1)
  }

  const currentPet = petStatus?.pet
  const petConfig: PetTypeConfig = getPetConfig(currentPet?.petType || selectedPetType)

  const feedPet = async () => {
    if (!petStatus?.pet || isFeeding) return

    setIsFeeding(true)
    setError(null)

    try {
      const { data } = await apiRequest<FeedPetResponse>('/api/pet/buy-food', {
        method: 'POST',
      })

      setPetStatus({ pet: data.pet, wallet: data.wallet })
      showToast(`${data.pet.name} loved the meal! -${data.purchase.cost} coins.`)
    } catch (feedError) {
      setError(formatApiError(feedError))
    } finally {
      setIsFeeding(false)
    }
  }

  const handleSavePet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaveError(null)

    if (!currentPet && !permanentFirstName.trim()) {
      setSaveError('Please give your new companion a permanent First Name.')
      return
    }

    setIsSavingPet(true)

    try {
      const { data } = await apiRequest<SavePetResponse>('/api/pet', {
        method: 'POST',
        body: JSON.stringify({
          firstName: permanentFirstName.trim(),
          name: (nickname.trim() || permanentFirstName.trim()),
          petType: selectedPetType,
        }),
      })

      setPetStatus({ pet: data.pet, wallet: data.wallet })
      setSelectedPetType(data.pet.petType || 'hatchling')
      setPermanentFirstName(data.pet.firstName || data.pet.name)
      setNickname(data.pet.name)
      setIsCustomizing(false)
      showToast(currentPet ? 'Pet customization saved!' : 'Congratulations! You adopted a new companion! 🎉')
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setIsSavingPet(false)
    }
  }

  const handleResetPet = async () => {
    if (confirmInput !== 'DELETE' || isResetting) return

    setIsResetting(true)
    setResetError(null)

    try {
      await apiRequest<{ success: boolean; wallet?: { coinsBalance: number } }>('/api/pet', {
        method: 'DELETE',
      })

      setPetStatus((prev) => (prev ? { pet: null, wallet: prev.wallet } : null))
      setIsResetModalOpen(false)
      setConfirmInput('')
      setIsCustomizing(true)
      setSelectedPetType('hatchling')
      setPermanentFirstName('')
      setNickname('')
      showToast('Pet has been released. Progress reset to 0.')
    } catch (err) {
      setResetError(formatApiError(err))
    } finally {
      setIsResetting(false)
    }
  }

  const canAffordFood =
    petStatus !== null && petStatus.wallet.coinsBalance >= foodCost

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="eyebrow">tamagotchi/companion.hub</span>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Pet Companion Care
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Turn focused study sprints into coins, keep your companion happy, and level up together.
            </p>
          </div>

          {currentPet && !isCustomizing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ⚙️ Customize
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmInput('')
                  setResetError(null)
                  setIsResetModalOpen(true)
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
              >
                ⚠️ Release/Reset Pet
              </button>
            </div>
          )}
        </header>

        {isLoading ? (
          <section
            className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <div className="text-center">
              <div className="mx-auto size-12 animate-pulse rounded-full bg-blue-100 dark:bg-blue-950" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Loading pet companion…
              </p>
            </div>
          </section>
        ) : !currentPet || isCustomizing ? (
          /* PET CREATION / CUSTOMIZATION ROSTER FORM */
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-700/80">
              <span className="eyebrow">roster/selection</span>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {currentPet ? 'Customize Your Companion' : 'Choose Your Starter Pet Companion'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {currentPet
                  ? 'Your companion\'s First Name is locked and permanent. You may update its nickname and archetype appearance.'
                  : 'Select an archetype and give your companion a permanent First Name to begin your journey.'}
              </p>
            </div>

            <form onSubmit={handleSavePet} className="mt-6 space-y-8">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {saveError}
                </div>
              )}

              {/* STARTER ROSTER CARDS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Select Companion Archetype
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {STARTER_PET_ROSTER.map((rosterPet) => {
                    const isSelected = selectedPetType === rosterPet.id
                    return (
                      <button
                        type="button"
                        key={rosterPet.id}
                        onClick={() => setSelectedPetType(rosterPet.id)}
                        className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-md'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="text-4xl sm:text-5xl py-2">{rosterPet.avatar}</div>
                        <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                          {rosterPet.title}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3">
                          {rosterPet.description}
                        </p>
                        <span className="mt-3 text-[10px] font-mono text-blue-600 dark:text-blue-400 italic">
                          "{rosterPet.quote}"
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* NAME FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700/80">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span>Permanent First Name</span>
                      {currentPet && <span className="text-amber-600 dark:text-amber-400" title="Locked and immutable">🔒 (Immutable)</span>}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(currentPet)}
                    value={permanentFirstName}
                    onChange={(e) => setPermanentFirstName(e.target.value)}
                    placeholder="e.g. Byte, Pippin, Shadow"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {currentPet
                      ? 'First Name is permanently recorded and cannot be altered once adopted.'
                      : 'Once set during adoption, the First Name is permanently locked.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Changeable Nickname / Display Name
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={permanentFirstName || 'e.g. Master Byte'}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    You can change your companion's nickname anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                {currentPet && (
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(false)}
                    disabled={isSavingPet}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingPet || (!currentPet && !permanentFirstName.trim())}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSavingPet ? 'Saving Companion…' : currentPet ? 'Save Changes' : 'Adopt Pet Companion 🚀'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          /* ACTIVE PET MAIN DASHBOARD */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* TAMAGOTCHI STATUS PANEL */}
            <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
              <div>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="grid size-40 place-items-center rounded-3xl border-4 border-blue-100 bg-blue-50 text-8xl shadow-inner dark:border-blue-900/60 dark:bg-blue-950/50"
                    aria-hidden="true"
                  >
                    {petConfig.avatar}
                  </div>

                  <div className="mt-4">
                    <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${petConfig.badgeColor}`}>
                      {petConfig.title}
                    </span>
                  </div>

                  <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {currentPet.name}
                  </h2>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>First Name: <strong className="font-mono text-slate-700 dark:text-slate-200">{currentPet.firstName || currentPet.name}</strong> 🔒</span>
                    <span>·</span>
                    <span>Last fed {new Date(currentPet.lastInteractedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <p className="mt-3 text-xs italic text-blue-600 dark:text-blue-400 font-medium">
                    "{petConfig.quote}"
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  <StatMeter
                    colorClass="bg-emerald-500"
                    label="Hunger Level"
                    value={currentPet.hungerLevel}
                  />
                  <StatMeter
                    colorClass="bg-pink-500"
                    label="Happiness Level"
                    value={currentPet.happinessLevel}
                  />
                </div>
              </div>
            </section>

            {/* WALLET / FOOD PANEL */}
            <aside className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
              <div>
                <span className="eyebrow">wallet/balance</span>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Available coins
                  </p>
                  <p className="mt-2 font-mono text-5xl font-black text-amber-900 dark:text-amber-100">
                    🪙 {petStatus.wallet.coinsBalance}
                  </p>
                  <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-300/80">
                    Earn 1 coin per minute spent in solo or study room focus sprints!
                  </p>
                </div>

                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Care Guidelines
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <li>• Each meal costs <strong>{foodCost} coins</strong>.</li>
                    <li>• Feeding grants <strong>+25 Hunger</strong> and <strong>+10 Happiness</strong>.</li>
                    <li>• Hunger decays naturally over inactive days.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  type="button"
                  onClick={() => void feedPet()}
                  disabled={isFeeding || !canAffordFood}
                >
                  {isFeeding
                    ? 'Feeding…'
                    : canAffordFood
                      ? `Feed ${currentPet.name} · ${foodCost} coins`
                      : `Need ${foodCost} coins to feed`}
                </button>
              </div>
            </aside>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={retryLoad}
              className="font-bold underline ml-3 text-xs"
            >
              Retry
            </button>
          </div>
        )}
      </main>

      {/* STRICT DELETION / RESET MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-white p-6 shadow-2xl dark:border-rose-900 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Release Pet & Reset Progress
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              Are you sure? This will permanently delete your pet and reset your progress to 0.
            </p>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              To confirm release, please type <strong className="font-mono text-rose-600 dark:text-rose-400">DELETE</strong> below:
            </p>

            {resetError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {resetError}
              </div>
            )}

            <div className="mt-4">
              <input
                type="text"
                autoFocus
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleResetPet()}
                disabled={confirmInput !== 'DELETE' || isResetting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isResetting ? 'Releasing…' : 'Confirm Release & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>tamagotchi · Singapore</code>
      </footer>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
