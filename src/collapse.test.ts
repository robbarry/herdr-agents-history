import { describe, expect, it } from 'vitest'
import { collapseEvents, focusIndexFor, windowBottom } from './collapse.js'
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

describe('focusIndexFor / windowBottom', () => {
  it('resolves focus ids and falls back to live when the anchor is trimmed away', () => {
    const groups = collapseEvents([event({}), event({ tool: 'Bash' }), event({ tool: 'Read' })])
    expect(focusIndexFor(groups, null)).toBeNull()
    expect(focusIndexFor(groups, groups[1].firstId)).toBe(1)
    expect(focusIndexFor(groups, 99_999)).toBeNull()
  })

  it('keeps the focused row visible: bottom-aligned normally, window pinned near the top', () => {
    const groups = collapseEvents(
      Array.from({ length: 10 }, (_, i) => event({ tool: `T${i}` }))
    )
    expect(windowBottom(groups, null, 5)).toBe(9) // live follows newest
    expect(windowBottom(groups, 7, 5)).toBe(7) // focused row at window bottom
    expect(windowBottom(groups, 1, 5)).toBe(4) // near the top the window stays full
  })
})
