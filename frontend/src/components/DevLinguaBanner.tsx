import { useEffect, useMemo, useState } from 'react'
import type { DevLinguaFlavor } from '@kiasucode/shared'

import {
  getDevLinguaMessage,
  type DevLinguaContext,
} from '../utils/devLingua'

interface DevLinguaBannerProps {
  flavor: DevLinguaFlavor
  context: DevLinguaContext
}

export function DevLinguaBanner({
  flavor,
  context,
}: DevLinguaBannerProps) {
  const [seed, setSeed] = useState(0)
  const [isMounted, setIsMounted] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const message = useMemo(
    () => getDevLinguaMessage(flavor, { ...context, seed }),
    [context, flavor, seed],
  )

  useEffect(() => {
    const entranceTimer = window.setTimeout(() => setIsVisible(true), 50)
    return () => window.clearTimeout(entranceTimer)
  }, [])

  const dismiss = () => {
    setIsVisible(false)
    window.setTimeout(() => setIsMounted(false), 300)
  }

  if (!isMounted) return null

  return (
    <aside
      className={`lingua-banner lingua-banner--${flavor} fixed right-4 bottom-4 z-[60] mt-0 w-[calc(100%-2rem)] max-w-md shadow-2xl transition-all duration-300 ease-out dark:border-gray-700 dark:bg-gray-800 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="lingua-banner__icon" aria-hidden="true">
        {flavor === 'positive' ? '✓' : flavor === 'negative' ? '!' : '~'}
      </div>
      <div>
        <span className="eyebrow">Dev-Lingua build note</span>
        <p>{message}</p>
      </div>
      <div className="lingua-banner__actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Generate another build note"
          onClick={() => setSeed((value) => value + 1)}
        >
          ↻
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Dismiss build note"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </aside>
  )
}
