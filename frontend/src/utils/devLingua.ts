import type {
  DevLinguaFlavor,
  ModuleStatus,
} from '@kiasucode/shared'

export interface DevLinguaContext {
  gpa?: number
  targetGpa?: number
  moduleCode?: string
  status?: ModuleStatus
  seed?: number
}

/**
 * DevLingua Dictionary: Singlish + Git / DevOps / Developer terminology quotes
 */
export const DEV_LINGUA_QUOTES = [
  'Git commit early, kiasu a bit better than lose code lah.',
  'Merge conflict? Alamak, rebase first before you push.',
  "Don't anyhow git push --force, later your tech lead scold.",
  'Walao eh, who wrote this spaghetti code? Git blame time.',
  'Checkout to new branch and chiong the assignment.',
  'GGWP, server 500 error again. Check your logs hor.',
  'LGTM! Pull request merged without conflict, damn swee lah.',
  'All unit tests passing, CI/CD pipeline green green steady pom pi pi!',
  'Code compiles on first try, shiok sia! Production ready.',
  'Fast forward merge successful, no merge conflict at all, steady lah!',
  'Clean commit history, your tech lead see already also cry happy tears.',
  'Sprint velocity high like rocket, this module confirm A+ one.',
  'Build failed jialat sia. Roll back distractions and hotfix immediately!',
  'Infinite loop detected, CPU fan screaming like jet engine alamak!',
  'Production down on Friday 5pm, siao liao who deployed without testing?',
  'Git stash pop failed, uncommitted changes gone case liao.',
  'Kopi break first, then come back git cherry-pick the best solutions.',
  "Don't kanchiong, small commits every day sure make it one.",
  'Refactor your study schedule bro, reduce technical debt early.',
  "Agak agak estimate duration, but don't miss the deployment deadline hor.",
  "Stash your distractions, checkout to focus branch, let's ship it!",
  'Keep shipping and stay kiasu, continuous integration continuous improvement.',
] as const

export const DEV_LINGUA_DICTIONARY = DEV_LINGUA_QUOTES

type MessageFactory = (context: DevLinguaContext) => string

const messagePresets: Record<DevLinguaFlavor, MessageFactory[]> = {
  positive: [
    () => 'Git commit early, kiasu a bit better than lose code lah.',
    () => 'LGTM! Pull request merged without conflict, damn swee lah.',
    ({ gpa = 4 }) => `LGTM, GPA ${gpa.toFixed(2)} steady lah! All checks green.`,
    () => 'All unit tests passing, CI/CD pipeline green green steady pom pi pi!',
    ({ moduleCode = 'this sprint' }) =>
      `${moduleCode} merged cleanly. Shiok sia, keep shipping!`,
    () => 'Code compiles on first try, shiok sia! Production ready.',
    () => 'Fast forward merge successful, no merge conflict at all, steady lah!',
    () => 'Clean commit history, your tech lead see already also cry happy tears.',
    ({ targetGpa = 4 }) =>
      `Target GPA ${targetGpa.toFixed(2)} deployed to production! Swee!`,
  ],
  negative: [
    () => 'Merge conflict? Alamak, rebase first before you push.',
    () => "Don't anyhow git push --force, later your tech lead scold.",
    () => 'Walao eh, who wrote this spaghetti code? Git blame time.',
    () => 'GGWP, server 500 error again. Check your logs hor.',
    ({ moduleCode = 'assignment' }) =>
      `Build failed jialat sia: Need to chiong ${moduleCode} before deadline!`,
    () => 'GPA regression detected. Time to hotfix study plan, can?',
    () => 'Tests red, but not game over. Roll back distractions first.',
    () => 'Infinite loop detected, CPU fan screaming like jet engine alamak!',
    () => 'Production down on Friday 5pm, siao liao who deployed without testing?',
    () => 'Git stash pop failed, uncommitted changes gone case liao.',
  ],
  casual: [
    () => 'Checkout to new branch and chiong the assignment.',
    () => 'Kopi break first, then come back git cherry-pick the best solutions.',
    () => "Don't kanchiong, small commits every day sure make it one.",
    () => 'Refactor your study schedule bro, reduce technical debt early.',
    () => "Agak agak estimate duration, but don't miss the deployment deadline hor.",
    () => "Stash your distractions, checkout to focus branch, let's ship it!",
    () => 'Pipeline still running—relak one corner, just keep shipping.',
    ({ targetGpa = 4 }) =>
      `Target ${targetGpa.toFixed(2)} queued. One tutorial at a time lah.`,
    () => 'Keep shipping and stay kiasu, continuous integration continuous improvement.',
  ],
}

/**
 * Fetch a completely random DevLingua quote from dictionary or specific flavor.
 */
export function getRandomDevLinguaQuote(flavor?: DevLinguaFlavor): string {
  if (flavor && messagePresets[flavor]) {
    const list = messagePresets[flavor]
    const factory = list[Math.floor(Math.random() * list.length)]
    return factory({})
  }
  return DEV_LINGUA_QUOTES[Math.floor(Math.random() * DEV_LINGUA_QUOTES.length)]
}

/**
 * Generate a DevLingua message with context, deterministic hashing, or randomized seed.
 */
export function getDevLinguaMessage(
  type: DevLinguaFlavor = 'casual',
  context: DevLinguaContext = {},
): string {
  const presets = messagePresets[type] ?? messagePresets.casual
  if (!presets || presets.length === 0) {
    return 'Git commit early, kiasu a bit better than lose code lah.'
  }

  const seed = context.seed ?? Math.floor(Math.random() * 1000000)
  const signal = `${type}:${context.gpa ?? ''}:${context.targetGpa ?? ''}:${context.moduleCode ?? ''}:${context.status ?? ''}`
  const hash = [...signal].reduce((total, character) => {
    return total + character.charCodeAt(0)
  }, seed)

  const index = Math.abs(hash) % presets.length
  const preset = presets[index]

  return preset?.(context) ?? presets[0](context)
}
