export const TAILWIND_COLOR_MAP: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-violet-500': '#8b5cf6',
  'bg-amber-500': '#f59e0b',
  'bg-fuchsia-500': '#d946ef',
  'bg-cyan-500': '#06b6d4',
  'bg-rose-500': '#f43f5e',
}

export const defaultCountdownColor = '#3b82f6'

export function resolveCountdownColor(color?: string | null): string {
  if (!color) return defaultCountdownColor
  if (color.startsWith('#')) return color
  if (TAILWIND_COLOR_MAP[color]) return TAILWIND_COLOR_MAP[color]
  return color.startsWith('bg-') ? defaultCountdownColor : color
}

