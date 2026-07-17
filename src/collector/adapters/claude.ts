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
  if (!Array.isArray(content)) return []

  const ts = typeof rec['timestamp'] === 'string' ? rec['timestamp'] : ''
  return content.flatMap((block) => {
    if (typeof block !== 'object' || block === null) return []
    const b = block as Record<string, unknown>
    if (b['type'] !== 'tool_use' || typeof b['name'] !== 'string') return []
    const input = typeof b['input'] === 'object' && b['input'] !== null ? (b['input'] as Record<string, unknown>) : {}
    return [{ ts, tool: b['name'], detail: pickDetail(input) }]
  })
}
