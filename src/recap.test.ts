import { describe, expect, it } from 'vitest'
import { computeRecap } from './recap.js'
import { StatsStore } from './stats.js'
import type { ToolEvent } from './types.js'

const NOW = new Date('2026-07-17T14:00:00')

let nextId = 1
function event(agentKey: string, label: string, tool: string, minutesAgo: number, detail = ''): ToolEvent {
  return {
    id: nextId++,
    ts: new Date(NOW.getTime() - minutesAgo * 60_000),
    agentKey,
    agentLabel: label,
    agentKind: 'claude',
    tool,
    detail,
    backfill: false
  }
}

describe('computeRecap', () => {
  it('awards worker, streak, and category badges from today only', () => {
    const store = new StatsStore()
    // busy agent: 4 bash + a 3-edit streak today
    store.add(event('a', 'busy-app', 'Bash', 120))
    store.add(event('a', 'busy-app', 'Bash', 110))
    store.add(event('a', 'busy-app', 'Bash', 100))
    store.add(event('a', 'busy-app', 'Bash', 90))
    store.add(event('a', 'busy-app', 'Edit', 30))
    store.add(event('a', 'busy-app', 'Edit', 29))
    store.add(event('a', 'busy-app', 'Edit', 28))
    // reader agent: 2 reads today, plus older-than-today noise that must be ignored
    store.add(event('b', 'reader-app', 'Read', 60))
    store.add(event('b', 'reader-app', 'Read', 50))
    store.add(event('b', 'reader-app', 'Bash', 60 * 26))
    // quiet agent: only yesterday's work
    store.add(event('c', 'quiet-app', 'Bash', 60 * 25))

    const recap = computeRecap(store, NOW)
    expect(recap.totalCalls).toBe(9)
    expect(recap.activeAgents).toBe(2)

    const byTitle = new Map(recap.badges.map((badge) => [badge.title, badge.description]))
    expect(byTitle.get('오늘의 일꾼')).toContain('busy-app')
    expect(byTitle.get('오늘의 일꾼')).toContain('7 calls')
    expect(byTitle.get('최장 콤보')).toContain('Bash ×4')
    expect(byTitle.get('다독왕')).toContain('reader-app')
    expect(byTitle.get('조용한 하루')).toContain('quiet-app')
  })

  it('handles an empty day without badges', () => {
    const recap = computeRecap(new StatsStore(), NOW)
    expect(recap.totalCalls).toBe(0)
    expect(recap.badges).toEqual([])
  })
})
