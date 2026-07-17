import { execFile } from 'node:child_process'
import type { StatsStore } from './stats.js'
import type { AgentSnapshot } from './types.js'
import { toolStyle } from './theme.js'

const HERDR_BIN = process.env['HERDR_BIN_PATH'] ?? 'herdr'
const SOURCE = 'cdragon.agent-tool-history'
const REPORT_INTERVAL_MS = 15_000
const RECENT_WINDOW_MS = 5 * 60_000
const TTL_MS = 45_000

/**
 * Pushes each agent's recently-dominant tool into the herdr sidebar as a
 * custom status badge (llmtrim-style), so "what is it doing" is visible
 * without opening the TUI. Badges expire via TTL when we stop reporting.
 */
export class BadgeReporter {
  private timer: NodeJS.Timeout | null = null
  private agents: AgentSnapshot[] = []
  private seq = 1

  constructor(private readonly stats: StatsStore) {}

  start(): void {
    this.timer = setInterval(() => this.report(), REPORT_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
  }

  update(agents: AgentSnapshot[]): void {
    this.agents = agents
  }

  private report(): void {
    const cutoff = Date.now() - RECENT_WINDOW_MS
    this.agents.forEach((agent) => {
      const recent = (this.stats.forAgent(agent.key)?.events ?? []).filter(
        (event) => !event.backfill && event.ts.getTime() >= cutoff
      )
      if (recent.length === 0) return

      const counts = recent.reduce(
        (acc, event) => acc.set(event.tool, (acc.get(event.tool) ?? 0) + 1),
        new Map<string, number>()
      )
      const [tool, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      const badge = `${toolStyle(tool).icon} ${tool.slice(0, 14)} ×${count}`

      execFile(
        HERDR_BIN,
        [
          'pane',
          'report-metadata',
          agent.paneId,
          '--source',
          SOURCE,
          '--custom-status',
          badge,
          '--ttl-ms',
          String(TTL_MS),
          '--seq',
          String(this.seq++)
        ],
        { timeout: 5_000 },
        () => {
          // best-effort: a failed report just means no badge this round
        }
      )
    })
  }
}
