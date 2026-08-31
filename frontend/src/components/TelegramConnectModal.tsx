import { useEffect, useState } from 'react'

interface TelegramConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

const pairingCode = 'KIASU-W8-4A7C'
const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'KiasuCodeBot'
const botLink = `https://t.me/${botName}?start=${pairingCode}`

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
        className="connect-modal border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
        <h2 className="text-slate-900 dark:text-slate-100" id="connect-title">Pair Telegram</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Ship quick grade updates from Telegram while this dashboard remains
          your source of truth.
        </p>
        <ol className="pairing-steps text-slate-700 dark:text-slate-200">
          <li><span>1</span><p>Open the KiasuCode bot.</p></li>
          <li><span>2</span><p>Send the secure pairing code below.</p></li>
          <li><span>3</span><p>Your academic pipeline syncs automatically.</p></li>
        </ol>
        <div className="pairing-code border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <span className="text-slate-500 dark:text-slate-400">PAIRING_TOKEN</span>
            <code className="text-slate-900 dark:text-slate-100">{pairingCode}</code>
          </div>
          <button type="button" onClick={copyPairingCode}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <a className="button button--telegram" href={botLink} target="_blank" rel="noreferrer">
          Open t.me/{botName} <span>↗</span>
        </a>
        <small className="text-slate-500 dark:text-slate-400">Mock integration only. No account data is sent yet.</small>
      </section>
    </div>
  )
}
