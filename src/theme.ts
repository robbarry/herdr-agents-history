const AGENT_PALETTE = [
  'cyan',
  'magenta',
  'green',
  'yellow',
  'blue',
  'red',
  'cyanBright',
  'magentaBright',
  'greenBright',
  'yellowBright'
] as const

export function agentColor(key: string): string {
  const hash = [...key].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return AGENT_PALETTE[hash % AGENT_PALETTE.length]
}

import { getConfig } from './config.js'

interface ToolStyle {
  readonly icon: string
  readonly color: string
}

// icons must be plain emoji (no VS16 variants like ✏️/🖥️) — ink and terminals
// disagree on VS16 width, which eats the padding space after the icon.
// each entry carries an --ascii fallback as the third element.
const TOOL_STYLES: ReadonlyArray<readonly [RegExp, ToolStyle, string]> = [
  [/^(Read|Glob|Grep|NotebookRead)$/i, { icon: '📖', color: 'blue' }, 'R'],
  [/^(Edit|MultiEdit|NotebookEdit|apply_patch)$/i, { icon: '📝', color: 'yellow' }, 'E'],
  [/^Write$/i, { icon: '💾', color: 'yellowBright' }, 'W'],
  [/^(Bash|exec_command|local_shell_call|shell)$/i, { icon: '💻', color: 'green' }, '$'],
  [/^(WebFetch|WebSearch|web_search|fetch)$/i, { icon: '🌐', color: 'cyan' }, '@'],
  [/^(Agent|Task)$/i, { icon: '🤖', color: 'magenta' }, 'A'],
  [/^Skill$/i, { icon: '✨', color: 'magentaBright' }, 'S'],
  [/^(update_plan|TodoWrite|TaskCreate|TaskUpdate|TaskList|TaskGet)$/i, { icon: '📋', color: 'gray' }, 'T'],
  [/^(ToolSearch|tool_search.*)$/i, { icon: '🔎', color: 'blueBright' }, '?'],
  [/^mcp__/i, { icon: '🔌', color: 'blueBright' }, 'M']
]

const DEFAULT_STYLE: ToolStyle = { icon: '🔧', color: 'white' }

export function toolStyle(tool: string): ToolStyle {
  const found = TOOL_STYLES.find(([pattern]) => pattern.test(tool))
  if (!found) return getConfig().ascii ? { ...DEFAULT_STYLE, icon: '·' } : DEFAULT_STYLE
  return getConfig().ascii ? { ...found[1], icon: found[2] } : found[1]
}

export const STATUS_ICON: Readonly<Record<string, string>> = {
  working: '●',
  blocked: '■',
  done: '✔',
  idle: '○'
}
