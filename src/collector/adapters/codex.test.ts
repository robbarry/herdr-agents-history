import { describe, expect, it } from 'vitest'
import { parseCodexLine } from './codex.js'

const functionCallLine = JSON.stringify({
  timestamp: '2026-07-17T03:49:56.000Z',
  type: 'response_item',
  payload: {
    type: 'function_call',
    name: 'exec_command',
    arguments: '{"cmd":"codex --version","workdir":"/tmp"}',
    call_id: 'call_1'
  }
})

describe('parseCodexLine', () => {
  it('extracts function_call records with the shell command as detail', () => {
    expect(parseCodexLine(functionCallLine)).toEqual([
      { ts: '2026-07-17T03:49:56.000Z', tool: 'exec_command', detail: 'codex --version' }
    ])
  })

  it('falls back to raw arguments when no known key is present', () => {
    const line = JSON.stringify({
      timestamp: '2026-07-17T03:50:11.000Z',
      payload: { type: 'custom_tool_call', name: 'update_plan', arguments: '{"plan":[{"step":"a"}]}' }
    })
    expect(parseCodexLine(line)).toEqual([
      { ts: '2026-07-17T03:50:11.000Z', tool: 'update_plan', detail: '{"plan":[{"step":"a"}]}' }
    ])
  })

  it('ignores non-tool payloads and malformed lines', () => {
    expect(parseCodexLine(JSON.stringify({ payload: { type: 'reasoning' } }))).toEqual([])
    expect(parseCodexLine(JSON.stringify({ payload: { type: 'agent_message', message: 'hi' } }))).toEqual([])
    expect(parseCodexLine('nope')).toEqual([])
  })
})
