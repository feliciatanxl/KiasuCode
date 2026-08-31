type PasswordStrength = 'weak' | 'medium' | 'strong'

interface PasswordStrengthDetails {
  strength: PasswordStrength
  label: string
  widthClass: string
  barClass: string
  textClass: string
}

interface PasswordStrengthMeterProps {
  password: string
}

function evaluatePasswordStrength(password: string): PasswordStrengthDetails {
  const score = [
    password.length >= 8,
    /\d/.test(password),
    /[^A-Za-z0-9\s]/.test(password),
  ].filter(Boolean).length

  if (score === 3) {
    return {
      strength: 'strong',
      label: 'Strong',
      widthClass: 'w-full',
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    }
  }

  if (score === 2) {
    return {
      strength: 'medium',
      label: 'Medium',
      widthClass: 'w-2/3',
      barClass: 'bg-amber-400',
      textClass: 'text-amber-600 dark:text-amber-400',
    }
  }

  return {
    strength: 'weak',
    label: 'Weak',
    widthClass: 'w-1/3',
    barClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  }
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const details = evaluatePasswordStrength(password)

  return (
    <div className="mt-2" aria-live="polite">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Password strength
        </span>
        <span className={`font-semibold ${details.textClass}`}>
          {details.label}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={details.strength === 'strong' ? 3 : details.strength === 'medium' ? 2 : 1}
        aria-valuetext={details.label}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${details.widthClass} ${details.barClass}`}
        />
      </div>
    </div>
  )
}
