const categoryColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-fuchsia-500',
  'bg-cyan-500',
  'bg-rose-500',
] as const

export function getCategoryColor(category: string): (typeof categoryColors)[number] {
  let hash = 0

  for (const character of category.trim()) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0
  }

  return categoryColors[hash % categoryColors.length]
}
