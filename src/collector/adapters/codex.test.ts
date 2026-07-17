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
      { ts: '2026-07-17T03:49:56.000Z', kind: 'tool', tool: 'exec_command', detail: 'codex --version' }
    ])
  })

  it('turns user_message payloads into turn boundaries', () => {
    const line = JSON.stringify({
      timestamp: '2026-07-17T03:45:00.000Z',
      payload: { type: 'user_message', message: 'lazy codex 삭제해줘' }
    })
    expect(parseCodexLine(line)).toEqual([
      { ts: '2026-07-17T03:45:00.000Z', kind: 'turn', tool: '', detail: 'lazy codex 삭제해줘' }
    ])
    const envContext = JSON.stringify({
      payload: { type: 'user_message', message: '<environment_context>...</environment_context>' }
    })
    expect(parseCodexLine(envContext)).toEqual([])
  })

  it('falls back to raw arguments when no known key is present', () => {
    const line = JSON.stringify({
      timestamp: '2026-07-17T03:50:11.000Z',
      payload: { type: 'custom_tool_call', name: 'update_plan', arguments: '{"plan":[{"step":"a"}]}' }
    })
    expect(parseCodexLine(line)).toEqual([
      { ts: '2026-07-17T03:50:11.000Z', kind: 'tool', tool: 'update_plan', detail: '{"plan":[{"step":"a"}]}' }
    ])
  })

  it('ignores non-tool payloads and malformed lines', () => {
    expect(parseCodexLine(JSON.stringify({ payload: { type: 'reasoning' } }))).toEqual([])
    expect(parseCodexLine(JSON.stringify({ payload: { type: 'agent_message', message: 'hi' } }))).toEqual([])
    expect(parseCodexLine('nope')).toEqual([])
  })
})
