import type { ParsedOutput, ParsedToolCall } from '../../types.js'

const TOOL_CALL_TYPES = new Set(['function_call', 'custom_tool_call', 'tool_search_call'])

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function parseArguments(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return ''
  if (!raw.startsWith('{')) return raw
  try {
    const args = JSON.parse(raw) as Record<string, unknown>
    const candidates = [args['cmd'], args['command'], args['path'], args['query'], args['plan']]
    const found = candidates.find((value) => typeof value === 'string' && value.length > 0)
    return typeof found === 'string' ? found : raw
  } catch {
    return raw
  }
}

/** Parse one line of a Codex rollout transcript (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl). */
export function parseCodexLine(line: string): ParsedToolCall[] {
  let record: unknown
  try {
    record = JSON.parse(line)
  } catch {
    return []
  }
  if (typeof record !== 'object' || record === null) return []
  const rec = record as Record<string, unknown>
  const payload = rec['payload']
  if (typeof payload !== 'object' || payload === null) return []
  const p = payload as Record<string, unknown>
  const type = typeof p['type'] === 'string' ? p['type'] : ''
  const ts = typeof rec['timestamp'] === 'string' ? rec['timestamp'] : ''

  if (type === 'user_message') {
    const message = typeof p['message'] === 'string' ? p['message'].trim() : ''
    if (message.length === 0 || message.startsWith('<')) return []
    return [{ ts, kind: 'turn', tool: '', detail: message.slice(0, 120), raw: message.slice(0, 2_000) }]
  }

  if (!TOOL_CALL_TYPES.has(type)) return []
  const tool = typeof p['name'] === 'string' && p['name'].length > 0 ? p['name'] : type
  const args = p['arguments'] ?? p['input']
  const detail = parseArguments(args)
  const raw = typeof args === 'string' ? prettyJson(args).slice(0, 4_000) : undefined
  const toolUseId = typeof p['call_id'] === 'string' ? p['call_id'] : undefined
  return [{ ts, kind: 'tool', tool, detail, raw, toolUseId }]
}

/** Parse a rollout line for a function_call_output, correlated to its call by call_id. */
export function parseCodexOutputLine(line: string): ParsedOutput[] {
  let record: unknown
  try {
    record = JSON.parse(line)
  } catch {
    return []
  }
  if (typeof record !== 'object' || record === null) return []
  const rec = record as Record<string, unknown>
  const payload = rec['payload']
  if (typeof payload !== 'object' || payload === null) return []
  const p = payload as Record<string, unknown>
  if (p['type'] !== 'function_call_output') return []
  if (typeof p['call_id'] !== 'string' || typeof p['output'] !== 'string') return []
  const ts = typeof rec['timestamp'] === 'string' ? rec['timestamp'] : ''
  const output = p['output'].slice(0, 4_000)
  return output.length > 0 ? [{ ts, toolUseId: p['call_id'], output }] : []
}
