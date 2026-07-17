import { describe, expect, it } from 'vitest'
import { StatsStore, sparkline } from './stats.js'
import type { ToolEvent } from './types.js'

let nextId = 1
function event(overrides: Partial<ToolEvent>): ToolEvent {
  return {
    id: nextId++,
    ts: new Date('2026-07-17T13:00:00Z'),
    agentKey: 'term_1',
    agentLabel: 'my-app',
    agentKind: 'claude',
    tool: 'Bash',
    detail: 'npm test',
    backfill: false,
    ...overrides
  }
}

describe('StatsStore', () => {
  it('accumulates totals, tool counts, and file counts per agent', () => {
    const store = new StatsStore()
    store.add(event({ tool: 'Bash', detail: 'npm test' }))
    store.add(event({ tool: 'Edit', detail: '/repo/src/a.ts' }))
    store.add(event({ tool: 'Edit', detail: '/repo/src/a.ts' }))
    store.add(event({ agentKey: 'term_2', tool: 'Read', detail: '/other/b.ts' }))

    const stats = store.forAgent('term_1')
    expect(stats?.total).toBe(3)
    expect(stats?.byTool.get('Edit')).toBe(2)
    expect(stats?.byFile.get('/repo/src/a.ts')).toBe(2)
    expect(store.forAgent('term_2')?.total).toBe(1)
    expect(store.topTools('term_1', 1)).toEqual([['Edit', 2]])
  })

  it('buckets recent activity for sparklines', () => {
    const store = new StatsStore()
    const now = new Date('2026-07-17T13:00:00Z')
    store.add(event({ ts: now }))
    store.add(event({ ts: new Date(now.getTime() - 4 * 60_000) }))
    const activity = store.activity('term_1', 5, now)
    expect(activity).toHaveLength(5)
    expect(activity[4]).toBe(1)
    expect(activity[2]).toBe(1)
  })
})

describe('sparkline', () => {
  it('scales values to block characters', () => {
    expect(sparkline([0, 1, 2, 4])).toBe('▁▃▅█')
    expect(sparkline([0, 0])).toBe('▁▁')
  })
})
