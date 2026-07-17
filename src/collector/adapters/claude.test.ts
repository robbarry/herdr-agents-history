import { describe, expect, it } from 'vitest'
import { parseClaudeLine } from './claude.js'

const toolUseLine = JSON.stringify({
  type: 'assistant',
  timestamp: '2026-07-06T16:10:02.123Z',
  message: {
    role: 'assistant',
    content: [
      { type: 'text', text: 'building the dashboard' },
      {
        type: 'tool_use',
        id: 'toolu_01',
        name: 'Bash',
        input: { command: 'node scripts/build-dashboard.mjs', description: 'Build dashboard' }
      },
      {
        type: 'tool_use',
        id: 'toolu_02',
        name: 'Read',
        input: { file_path: '/tmp/screenshot.png' }
      }
    ]
  }
})

describe('parseClaudeLine', () => {
  it('extracts every tool_use block with a detail hint', () => {
    const calls = parseClaudeLine(toolUseLine)
    expect(calls).toEqual([
      { ts: '2026-07-06T16:10:02.123Z', tool: 'Bash', detail: 'node scripts/build-dashboard.mjs' },
      { ts: '2026-07-06T16:10:02.123Z', tool: 'Read', detail: '/tmp/screenshot.png' }
    ])
  })

  it('ignores user/result records and malformed lines', () => {
    expect(parseClaudeLine(JSON.stringify({ type: 'user', message: { content: 'hi' } }))).toEqual([])
    expect(parseClaudeLine('{ not json')).toEqual([])
    expect(parseClaudeLine(JSON.stringify({ message: { content: [{ type: 'text', text: 'x' }] } }))).toEqual([])
  })
})
