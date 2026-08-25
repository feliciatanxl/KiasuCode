import { useEffect, useState } from 'react'

interface TelegramConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

const pairingCode = 'KIASU-W8-4A7C'
const botLink = `https://t.me/KiasuCodeBot?start=${pairingCode}`

export function TelegramConnectModal({
  isOpen,
  onClose,
}: TelegramConnectModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const copyPairingCode = async () => {
    await navigator.clipboard.writeText(pairingCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="connect-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="connect-modal__header">
          <div className="telegram-mark" aria-hidden="true">➤</div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <span className="eyebrow">Companion bot · coming next</span>
        <h2 id="connect-title">Pair Telegram</h2>
        <p>
          Ship quick grade updates from Telegram while this dashboard remains
          your source of truth.
        </p>
        <ol className="pairing-steps">
          <li><span>1</span><p>Open the KiasuCode bot.</p></li>
          <li><span>2</span><p>Send the secure pairing code below.</p></li>
          <li><span>3</span><p>Your academic pipeline syncs automatically.</p></li>
        </ol>
        <div className="pairing-code">
          <div>
            <span>PAIRING_TOKEN</span>
            <code>{pairingCode}</code>
          </div>
          <button type="button" onClick={copyPairingCode}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <a className="button button--telegram" href={botLink} target="_blank" rel="noreferrer">
          Open t.me/KiasuCodeBot <span>↗</span>
        </a>
        <small>Mock integration only. No account data is sent yet.</small>
      </section>
    </div>
  )
}
