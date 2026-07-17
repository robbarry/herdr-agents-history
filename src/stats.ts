import type { ToolEvent } from './types.js'

const EVENTS_PER_AGENT = 500
const BUCKET_MS = 120_000
const BUCKET_RETENTION = 45

export interface AgentStats {
  readonly label: string
  readonly kind: string
  readonly total: number
  readonly byTool: ReadonlyMap<string, number>
  readonly byFile: ReadonlyMap<string, number>
  readonly events: readonly ToolEvent[]
  readonly firstTs: Date | null
  readonly lastEvent: ToolEvent | null
}

interface MutableStats {
  label: string
  kind: string
  total: number
  byTool: Map<string, number>
  byFile: Map<string, number>
  buckets: Map<number, number>
  events: ToolEvent[]
  firstTs: Date | null
  lastEvent: ToolEvent | null
}

/**
 * Unbounded per-agent counters fed by every ToolEvent. The global feed buffer
 * is capped, so totals and distributions live here instead. Only the per-agent
 * timeline (`events`) is bounded.
 */
export class StatsStore {
  private readonly agents = new Map<string, MutableStats>()

  add(event: ToolEvent): void {
    const stats: MutableStats = this.agents.get(event.agentKey) ?? {
      label: event.agentLabel,
      kind: event.agentKind,
      total: 0,
      byTool: new Map(),
      byFile: new Map(),
      buckets: new Map(),
      events: [],
      firstTs: null,
      lastEvent: null
    }
    stats.label = event.agentLabel
    stats.total += 1
    stats.byTool.set(event.tool, (stats.byTool.get(event.tool) ?? 0) + 1)
    if (event.detail.startsWith('/') || event.detail.startsWith('~/')) {
      stats.byFile.set(event.detail, (stats.byFile.get(event.detail) ?? 0) + 1)
    }

    const bucket = Math.floor(event.ts.getTime() / BUCKET_MS)
    stats.buckets.set(bucket, (stats.buckets.get(bucket) ?? 0) + 1)
    const cutoff = Math.floor(Date.now() / BUCKET_MS) - BUCKET_RETENTION
    for (const key of stats.buckets.keys()) {
      if (key < cutoff) stats.buckets.delete(key)
    }

    stats.events.push(event)
    if (stats.events.length > EVENTS_PER_AGENT) stats.events.shift()
    if (stats.firstTs === null || event.ts < stats.firstTs) stats.firstTs = event.ts
    if (stats.lastEvent === null || event.ts >= stats.lastEvent.ts) stats.lastEvent = event
    this.agents.set(event.agentKey, stats)
  }

  forAgent(key: string): AgentStats | undefined {
    return this.agents.get(key)
  }

  allAgents(): Array<readonly [string, AgentStats]> {
    return [...this.agents.entries()]
  }

  /** Calls per 2-minute bucket, oldest → newest, for sparklines. */
  activity(key: string, bucketCount = 15, now = new Date()): number[] {
    const stats = this.agents.get(key)
    const current = Math.floor(now.getTime() / BUCKET_MS)
    return Array.from({ length: bucketCount }, (_, i) => {
      const bucket = current - (bucketCount - 1 - i)
      return stats?.buckets.get(bucket) ?? 0
    })
  }

  topTools(key: string, count: number): Array<readonly [string, number]> {
    const stats = this.agents.get(key)
    if (!stats) return []
    return [...stats.byTool.entries()].sort((a, b) => b[1] - a[1]).slice(0, count)
  }

  topFiles(key: string, count: number): Array<readonly [string, number]> {
    const stats = this.agents.get(key)
    if (!stats) return []
    return [...stats.byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, count)
  }
}

const TICKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const

export function sparkline(values: number[]): string {
  const max = Math.max(...values, 1)
  return values.map((value) => TICKS[Math.min(7, Math.round((value / max) * 7))]).join('')
}
