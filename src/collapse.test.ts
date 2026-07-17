import { describe, expect, it } from 'vitest'
import { clampWindow, collapseEvents, focusIndexFor } from './collapse.js'
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

describe('focusIndexFor', () => {
  it('resolves focus ids and falls back to live when the anchor is trimmed away', () => {
    const groups = collapseEvents([event({}), event({ tool: 'Bash' }), event({ tool: 'Read' })])
    expect(focusIndexFor(groups, null)).toBeNull()
    expect(focusIndexFor(groups, groups[1].firstId)).toBe(1)
    expect(focusIndexFor(groups, 99_999)).toBeNull()
  })
})

describe('clampWindow', () => {
  // 10 groups (indices 0-9), a window of height 5 currently showing rows 5-9 (bottom = 9)
  const last = 9
  const listHeight = 5
  const windowBottomNow = 9

  it('does not move the window while focus stays inside the visible range', () => {
    expect(clampWindow(9, windowBottomNow, listHeight, last)).toBe(9)
    expect(clampWindow(7, windowBottomNow, listHeight, last)).toBe(9) // still inside [5,9]
    expect(clampWindow(5, windowBottomNow, listHeight, last)).toBe(9) // top edge, still inside
  })

  it('scrolls up by exactly one once focus passes the top edge', () => {
    expect(clampWindow(4, windowBottomNow, listHeight, last)).toBe(8)
  })

  it('scrolls down by exactly one once focus passes the bottom edge', () => {
    const bottom = 6 // window showing rows 2-6
    expect(clampWindow(7, bottom, listHeight, last)).toBe(7)
  })

  it('pins to the top when focus reaches the very first row', () => {
    expect(clampWindow(0, windowBottomNow, listHeight, last)).toBe(4)
  })

  it('never scrolls past the newest row', () => {
    expect(clampWindow(9, 3, listHeight, last)).toBe(9)
  })
})
