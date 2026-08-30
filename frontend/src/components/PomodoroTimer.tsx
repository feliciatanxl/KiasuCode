import { useCallback, useEffect, useRef, useState } from 'react'

import { apiRequest, formatApiError } from '../utils/api'

interface StudySessionResponse {
  session: {
    id: string
    moduleId: string
    durationMinutes: number
    coinsEarned: number
    createdAt: string
  }
  wallet: {
    coinsBalance: number
  }
}

interface PomodoroTimerProps {
  moduleCode: string
  moduleId: string
  onSessionCompleted?: (coinsEarned: number, coinsBalance: number) => void
}

type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'saving'
  | 'completed'
  | 'error'

const focusDurationMinutes = 25
const focusDurationSeconds = focusDurationMinutes * 60

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

export function PomodoroTimer({
  moduleCode,
  moduleId,
  onSessionCompleted,
}: PomodoroTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(focusDurationSeconds)
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [coinsBalance, setCoinsBalance] = useState<number | null>(null)
  const endAtRef = useRef<number | null>(null)
  const completionSentRef = useRef(false)

  const resetTimer = useCallback(() => {
    endAtRef.current = null
    completionSentRef.current = false
    setRemainingSeconds(focusDurationSeconds)
    setStatus('idle')
    setMessage(null)
  }, [])

  useEffect(() => {
    if (status !== 'running') return

    const updateRemainingTime = () => {
      if (endAtRef.current === null) return

      setRemainingSeconds(
        Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)),
      )
    }

    updateRemainingTime()
    const intervalId = window.setInterval(updateRemainingTime, 250)

    return () => window.clearInterval(intervalId)
  }, [status])

  const recordCompletedSession = useCallback(async () => {
    setStatus('saving')
    setMessage('Focus complete. Recording your coins…')

    try {
      const { data, status: responseStatus } =
        await apiRequest<StudySessionResponse>('/api/study/session', {
          method: 'POST',
          body: JSON.stringify({
            module_id: moduleId,
            duration_minutes: focusDurationMinutes,
          }),
        })

      if (responseStatus !== 201) {
        throw new Error(`Unexpected study session status (${responseStatus}).`)
      }

      setCoinsBalance(data.wallet.coinsBalance)
      setMessage(`Session logged. You earned ${data.session.coinsEarned} coins.`)
      setStatus('completed')
      onSessionCompleted?.(
        data.session.coinsEarned,
        data.wallet.coinsBalance,
      )
    } catch (error) {
      setMessage(`${formatApiError(error)} Your completed timer can be retried.`)
      setStatus('error')
    }
  }, [moduleId, onSessionCompleted])

  useEffect(() => {
    if (
      status !== 'running'
      || remainingSeconds !== 0
      || completionSentRef.current
    ) {
      return
    }

    completionSentRef.current = true
    void recordCompletedSession()
  }, [recordCompletedSession, remainingSeconds, status])

  const startTimer = () => {
    if (remainingSeconds <= 0) return

    endAtRef.current = Date.now() + remainingSeconds * 1000
    setMessage(null)
    setStatus('running')
  }

  const pauseTimer = () => {
    if (status !== 'running' || endAtRef.current === null) return

    setRemainingSeconds(
      Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)),
    )
    endAtRef.current = null
    setStatus('paused')
  }

  const retryReward = () => {
    completionSentRef.current = true
    void recordCompletedSession()
  }

  const progress =
    ((focusDurationSeconds - remainingSeconds) / focusDurationSeconds) * 100

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-labelledby="pomodoro-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">focus/session</span>
          <h2
            className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100"
            id="pomodoro-title"
          >
            {moduleCode} Pomodoro
          </h2>
        </div>
        {coinsBalance !== null ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {coinsBalance} coins
          </span>
        ) : null}
      </div>

      <div className="mt-5 text-center">
        <output
          className="font-mono text-5xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white"
          aria-live="off"
        >
          {formatTime(remainingSeconds)}
        </output>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
          role="progressbar"
          aria-label="Pomodoro progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {status === 'running' ? (
          <button className="button button--primary" type="button" onClick={pauseTimer}>
            Pause
          </button>
        ) : status === 'error' ? (
          <button className="button button--primary" type="button" onClick={retryReward}>
            Retry reward
          </button>
        ) : (
          <button
            className="button button--primary"
            type="button"
            onClick={startTimer}
            disabled={status === 'saving' || status === 'completed'}
          >
            {status === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          className="button button--ghost"
          type="button"
          onClick={resetTimer}
          disabled={status === 'saving'}
        >
          Stop
        </button>
      </div>

      {message ? (
        <p
          className={`mt-4 text-center text-sm ${
            status === 'error'
              ? 'text-red-600 dark:text-red-300'
              : 'text-slate-600 dark:text-slate-300'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}
    </section>
  )
}
