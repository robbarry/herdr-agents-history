import { describe, expect, it } from 'vitest'
import { BUFFER_LIMIT, insertEvents } from './buffer.js'
import type { ToolEvent } from './types.js'

let nextId = 1
function event(overrides: Partial<ToolEvent>): ToolEvent {
  return {
    id: nextId++,
    ts: new Date('2026-07-17T13:00:00Z'),
    agentKey: 'a',
    agentLabel: 'app',
    agentKind: 'claude',
    kind: 'tool',
    tool: 'Bash',
    detail: '',
    backfill: false,
    ...overrides
  }
}

describe('insertEvents', () => {
  it('appends a live batch in order', () => {
    const a = event({ backfill: false })
    const b = event({ backfill: false })
    expect(insertEvents([], [a, b]).map((e) => e.id)).toEqual([a.id, b.id])
  })

  it('merge-sorts a backfill batch into existing events by timestamp then id', () => {
    const existing = [event({ backfill: true, ts: new Date('2026-07-17T10:00:00Z') })]
    const batch = [
      event({ backfill: true, ts: new Date('2026-07-17T09:00:00Z') }),
      event({ backfill: true, ts: new Date('2026-07-17T11:00:00Z') })
    ]
    const result = insertEvents(existing, batch)
    expect(result.map((e) => e.ts.getTime())).toEqual([
      new Date('2026-07-17T09:00:00Z').getTime(),
      new Date('2026-07-17T10:00:00Z').getTime(),
      new Date('2026-07-17T11:00:00Z').getTime()
    ])
  })

  it('breaks timestamp ties by id so order is stable', () => {
    const t = new Date('2026-07-17T12:00:00Z')
    const first = event({ backfill: true, ts: t })
    const second = event({ backfill: true, ts: t })
    const result = insertEvents([], [second, first])
    expect(result.map((e) => e.id)).toEqual([first.id, second.id].sort((a, b) => a - b))
  })

  it('caps the buffer at BUFFER_LIMIT, keeping the newest', () => {
    const existing = Array.from({ length: BUFFER_LIMIT }, () => event({ backfill: false }))
    const batch = [event({ backfill: false, detail: 'newest' })]
    const result = insertEvents(existing, batch)
    expect(result).toHaveLength(BUFFER_LIMIT)
    expect(result[result.length - 1].detail).toBe('newest')
  })

  it('returns the same array for an empty batch', () => {
    const existing = [event({})]
    expect(insertEvents(existing, [])).toBe(existing)
  })
})
