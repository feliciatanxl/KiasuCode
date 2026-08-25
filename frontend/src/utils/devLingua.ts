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

type MessageFactory = (context: DevLinguaContext) => string

const messagePresets: Record<DevLinguaFlavor, MessageFactory[]> = {
  positive: [
    ({ gpa = 4 }) => `LGTM, GPA ${gpa.toFixed(2)} steady lah!`,
    () => 'All checks green. Academic build damn solid.',
    ({ moduleCode = 'this sprint' }) =>
      `${moduleCode} merged cleanly. Shiok—keep shipping!`,
  ],
  negative: [
    ({ moduleCode = 'assignment' }) =>
      `Build failed: Need to chiong ${moduleCode} before deadline.`,
    () => 'GPA regression detected. Time to hotfix study plan, can?',
    () => 'Tests red, but not game over. Roll back distractions first.',
  ],
  casual: [
    () => 'Refactor your study schedule, bro. Small commits every day.',
    () => "Pipeline still running—don't kanchiong, just keep shipping.",
    ({ targetGpa = 4 }) =>
      `Target ${targetGpa.toFixed(2)} queued. One tutorial at a time lah.`,
  ],
}

export function getDevLinguaMessage(
  type: DevLinguaFlavor,
  context: DevLinguaContext = {},
): string {
  const presets = messagePresets[type]
  const signal = `${type}:${context.gpa ?? ''}:${context.targetGpa ?? ''}:${context.moduleCode ?? ''}:${context.status ?? ''}`
  const hash = [...signal].reduce((total, character) => {
    return total + character.charCodeAt(0)
  }, context.seed ?? 0)
  const preset = presets[hash % presets.length]

  return preset?.(context) ?? presets[0](context)
}
