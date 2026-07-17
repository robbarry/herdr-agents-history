import type { ParsedToolCall } from '../../types.js'

function pickDetail(input: Record<string, unknown>): string {
  const candidates = [
    input['command'],
    input['file_path'],
    input['pattern'],
    input['url'],
    input['query'],
    input['skill'],
    input['description'],
    input['prompt']
  ]
  const found = candidates.find((value) => typeof value === 'string' && value.length > 0)
  return typeof found === 'string' ? found : ''
}

/**
 * A user record is a conversation-turn boundary only when it carries an actual
 * human prompt — not tool results, sidechain (subagent) prompts, meta records,
 * or slash-command/caveat markup (which starts with '<').
 */
function userPrompt(rec: Record<string, unknown>, content: unknown): string | null {
  if (rec['isSidechain'] === true || rec['isMeta'] === true) return null
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content) &&
          !content.some((b) => typeof b === 'object' && b !== null && (b as Record<string, unknown>)['type'] === 'tool_result')
        ? content
            .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
            .filter((b) => b['type'] === 'text' && typeof b['text'] === 'string')
            .map((b) => b['text'] as string)
            .join(' ')
        : ''
  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.startsWith('<')) return null
  return trimmed
}

/** Parse one line of a Claude Code transcript (~/.claude/projects/<dir>/<session>.jsonl). */
export function parseClaudeLine(line: string): ParsedToolCall[] {
  let record: unknown
  try {
    record = JSON.parse(line)
  } catch {
    return []
  }
  if (typeof record !== 'object' || record === null) return []
  const rec = record as Record<string, unknown>
  const message = rec['message']
  if (typeof message !== 'object' || message === null) return []
  const content = (message as Record<string, unknown>)['content']
  const ts = typeof rec['timestamp'] === 'string' ? rec['timestamp'] : ''

  if (rec['type'] === 'user') {
    const prompt = userPrompt(rec, content)
    return prompt ? [{ ts, kind: 'turn', tool: '', detail: prompt.slice(0, 120) }] : []
  }

  if (!Array.isArray(content)) return []
  return content.flatMap((block) => {
    if (typeof block !== 'object' || block === null) return []
    const b = block as Record<string, unknown>
    if (b['type'] !== 'tool_use' || typeof b['name'] !== 'string') return []
    const input = typeof b['input'] === 'object' && b['input'] !== null ? (b['input'] as Record<string, unknown>) : {}
    return [{ ts, kind: 'tool', tool: b['name'], detail: pickDetail(input) }]
  })
}
