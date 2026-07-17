import { describe, expect, it } from 'vitest'
import { bottomIndexFor, collapseEvents } from './collapse.js'
import type { ToolEvent } from './types.js'

let nextId = 1
function event(overrides: Partial<ToolEvent>): ToolEvent {
  return {
    id: nextId++,
    ts: new Date('2026-07-17T13:00:00Z'),
    agentKey: 'a',
    agentLabel: 'my-app',
    agentKind: 'claude',
    kind: 'tool',
    tool: 'Edit',
    detail: 'src/a.ts',
    backfill: false,
    ...overrides
  }
}

describe('collapseEvents', () => {
  it('collapses consecutive same-agent same-tool calls and keeps a stable firstId', () => {
    const first = event({})
    const groups = collapseEvents([first, event({}), event({ tool: 'Bash' })])
    expect(groups).toHaveLength(2)
    expect(groups[0].count).toBe(2)
    expect(groups[0].firstId).toBe(first.id)
  })

  it('never merges across turn boundaries', () => {
    const groups = collapseEvents([
      event({}),
      event({ kind: 'turn', tool: '', detail: '새 작업 부탁해' }),
      event({})
    ])
    expect(groups).toHaveLength(3)
    expect(groups[1].event.kind).toBe('turn')
  })
})

describe('bottomIndexFor', () => {
  it('follows the newest group when live, resolves anchors, and survives trimmed anchors', () => {
    const groups = collapseEvents([event({}), event({ tool: 'Bash' }), event({ tool: 'Read' })])
    expect(bottomIndexFor(groups, null)).toBe(2)
    expect(bottomIndexFor(groups, groups[1].firstId)).toBe(1)
    expect(bottomIndexFor(groups, 99_999)).toBe(2)
  })
})
