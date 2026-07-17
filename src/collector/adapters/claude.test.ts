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
  it('extracts every tool_use block with a detail hint and the full input as raw', () => {
    const calls = parseClaudeLine(toolUseLine)
    expect(calls).toMatchObject([
      { ts: '2026-07-06T16:10:02.123Z', kind: 'tool', tool: 'Bash', detail: 'node scripts/build-dashboard.mjs' },
      { ts: '2026-07-06T16:10:02.123Z', kind: 'tool', tool: 'Read', detail: '/tmp/screenshot.png' }
    ])
    expect(calls[0].raw).toContain('"description": "Build dashboard"')
  })

  it('turns a genuine user prompt into a turn boundary', () => {
    const line = JSON.stringify({
      type: 'user',
      timestamp: '2026-07-17T05:00:00.000Z',
      isSidechain: false,
      message: { role: 'user', content: '다음 기능 추가 봐줘. 스크롤 지원' }
    })
    expect(parseClaudeLine(line)).toMatchObject([
      { ts: '2026-07-17T05:00:00.000Z', kind: 'turn', tool: '', detail: '다음 기능 추가 봐줘. 스크롤 지원' }
    ])
  })

  it('does not treat tool results, sidechains, meta, or command markup as turns', () => {
    const base = { type: 'user', timestamp: '2026-07-17T05:00:00.000Z' }
    expect(
      parseClaudeLine(JSON.stringify({ ...base, message: { content: [{ type: 'tool_result', content: 'ok' }] } }))
    ).toEqual([])
    expect(
      parseClaudeLine(JSON.stringify({ ...base, isSidechain: true, message: { content: 'subagent prompt' } }))
    ).toEqual([])
    expect(parseClaudeLine(JSON.stringify({ ...base, isMeta: true, message: { content: 'meta' } }))).toEqual([])
    expect(
      parseClaudeLine(JSON.stringify({ ...base, message: { content: '<command-name>/model</command-name>' } }))
    ).toEqual([])
  })

  it('ignores malformed lines and text-only assistant records', () => {
    expect(parseClaudeLine('{ not json')).toEqual([])
    expect(parseClaudeLine(JSON.stringify({ message: { content: [{ type: 'text', text: 'x' }] } }))).toEqual([])
  })
})
