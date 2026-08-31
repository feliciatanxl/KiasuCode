export interface PetTypeConfig {
  id: string
  name: string
  title: string
  avatar: string
  description: string
  bgClass: string
  borderClass: string
  badgeColor: string
  quote: string
}

export const STARTER_PET_ROSTER: PetTypeConfig[] = [
  {
    id: 'hatchling',
    name: 'Byte',
    title: 'The Kiasu Hatchling',
    avatar: '🐣',
    description: 'An eager young hatchling determined to never lose code or drop GPA.',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    quote: 'Chiong ah! Keep feeding me kopi and coins!',
  },
  {
    id: 'ninja-cat',
    name: 'Shadow',
    title: 'Code Ninja Cat',
    avatar: '🐱',
    description: 'Stealthily squashes bugs in the dark and commits clean code before code review.',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40',
    borderClass: 'border-purple-200 dark:border-purple-800',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    quote: 'Silent git push, loud test suite passing.',
  },
  {
    id: 'cyber-shiba',
    name: 'Doge',
    title: 'Cyber Shiba',
    avatar: '🐕',
    description: 'Much focus, such productivity, very compile. Loyal companion for midnight sprints.',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    quote: 'Wow. Much commit. Very high GPA.',
  },
  {
    id: 'pixel-penguin',
    name: 'Pippin',
    title: 'Pixel Penguin',
    avatar: '🐧',
    description: 'Chills your CPU temperatures and stays cool under high-stress exam deadlines.',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    borderClass: 'border-sky-200 dark:border-sky-800',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    quote: 'Keep chill and don’t panic push on main.',
  },
  {
    id: 'byte-dragon',
    name: 'Ignis',
    title: 'Byte Dragon',
    avatar: '🐲',
    description: 'Breathes fiery passion into every build pipeline and incinerates syntax errors.',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-800',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    quote: 'Burn down the backlog and conquer exams!',
  },
]

export function getPetConfig(petType?: string | null): PetTypeConfig {
  const match = STARTER_PET_ROSTER.find((p) => p.id === petType)
  return match || STARTER_PET_ROSTER[0]
}
