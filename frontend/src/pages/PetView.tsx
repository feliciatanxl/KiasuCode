import { useEffect, useState } from 'react'

import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useToast } from '../context/ToastContext'
import {
  apiRequest,
  formatApiError,
  isAbortError,
} from '../utils/api'

interface Pet {
  id: string
  name: string
  hungerLevel: number
  happinessLevel: number
  lastInteractedAt: string
}

interface PetStatusResponse {
  pet: Pet
  wallet: {
    coinsBalance: number
  }
}

interface FeedPetResponse extends PetStatusResponse {
  purchase: {
    cost: number
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

  useEffect(() => {
    const controller = new AbortController()

    void apiRequest<PetStatusResponse>('/api/pet', {
      signal: controller.signal,
    })
      .then(({ data }) => setPetStatus(data))
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

  const feedPet = async () => {
    if (!petStatus || isFeeding) return

    setIsFeeding(true)
    setError(null)

    try {
      const { data } = await apiRequest<FeedPetResponse>('/api/pet/buy-food', {
        method: 'POST',
      })

      setPetStatus({ pet: data.pet, wallet: data.wallet })
      showToast(`${data.pet.name} enjoyed the food! -${data.purchase.cost} coins.`)
    } catch (feedError) {
      setError(formatApiError(feedError))
    } finally {
      setIsFeeding(false)
    }
  }

  const canAffordFood =
    petStatus !== null && petStatus.wallet.coinsBalance >= foodCost

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <header className="mb-8">
          <span className="eyebrow">tamagotchi/status</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Pet Companion
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Turn focused study sessions into coins, then keep your companion fed and happy.
          </p>
        </header>

        {isLoading ? (
          <section
            className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <div className="text-center">
              <div className="mx-auto size-12 animate-pulse rounded-full bg-blue-100 dark:bg-blue-950" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Loading pet status…
              </p>
            </div>
          </section>
        ) : petStatus ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* TAMAGOTCHI STATUS PANEL */}
            <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
              <div>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="grid size-36 place-items-center rounded-full border-4 border-blue-100 bg-blue-50 text-7xl shadow-inner dark:border-blue-900 dark:bg-blue-950/50"
                    aria-hidden="true"
                  >
                    🐣
                  </div>
                  <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
                    {petStatus.pet.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Last interaction{' '}
                    {new Date(petStatus.pet.lastInteractedAt).toLocaleString()}
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  <StatMeter
                    colorClass="bg-emerald-500"
                    label="Hunger"
                    value={petStatus.pet.hungerLevel}
                  />
                  <StatMeter
                    colorClass="bg-pink-500"
                    label="Happiness"
                    value={petStatus.pet.happinessLevel}
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
                    {petStatus.wallet.coinsBalance}
                  </p>
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
                      ? `Feed Pet · ${foodCost} coins`
                      : `Need ${foodCost} coins`}
                </button>
                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Food restores 25 hunger and adds 10 happiness.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <section className="grid min-h-80 place-items-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pet status unavailable
              </h2>
              <p className="mt-2 text-sm text-red-600 dark:text-red-300" role="alert">
                {error ?? 'Unable to load your pet.'}
              </p>
              <button className="button button--primary mt-5" type="button" onClick={retryLoad}>
                Try again
              </button>
            </div>
          </section>
        )}

        {error && petStatus ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </main>

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
