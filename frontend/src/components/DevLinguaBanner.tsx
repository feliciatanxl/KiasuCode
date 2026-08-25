import { useMemo, useState } from 'react'
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
  const message = useMemo(
    () => getDevLinguaMessage(flavor, { ...context, seed }),
    [context, flavor, seed],
  )

  return (
    <aside className={`lingua-banner lingua-banner--${flavor}`}>
      <div className="lingua-banner__icon" aria-hidden="true">
        {flavor === 'positive' ? '✓' : flavor === 'negative' ? '!' : '~'}
      </div>
      <div>
        <span className="eyebrow">Dev-Lingua build note</span>
        <p>{message}</p>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label="Generate another build note"
        onClick={() => setSeed((value) => value + 1)}
      >
        ↻
      </button>
    </aside>
  )
}
