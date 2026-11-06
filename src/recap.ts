import type { StatsStore } from './stats.js'
import type { ToolEvent } from './types.js'

export interface RecapBadge {
  readonly icon: string
  readonly title: string
  readonly description: string
}

export interface Recap {
  readonly totalCalls: number
  readonly activeAgents: number
  readonly spanLabel: string
  readonly badges: RecapBadge[]
}

interface AgentDay {
  readonly key: string
  readonly label: string
  readonly events: readonly ToolEvent[]
}

const BASH_TOOLS = /^(Bash|exec_command|local_shell_call|shell)$/i
const READ_TOOLS = /^(Read|Glob|Grep|NotebookRead)$/i
const WRITE_TOOLS = /^(Write|Edit|MultiEdit|NotebookEdit|apply_patch)$/i
const WEB_TOOLS = /^(WebFetch|WebSearch|web_search|fetch)$/i
const DELEGATE_TOOLS = /^(Agent|Task)$/i

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function countMatching(agent: AgentDay, pattern: RegExp): number {
  return agent.events.filter((event) => pattern.test(event.tool)).length
}

function topBy(agents: AgentDay[], score: (agent: AgentDay) => number): { agent: AgentDay; value: number } | null {
  const scored = agents
    .map((agent) => ({ agent, value: score(agent) }))
    .sort((a, b) => b.value - a.value)
  return scored.length > 0 && scored[0].value > 0 ? scored[0] : null
}

interface Streak {
  readonly agent: AgentDay
  readonly tool: string
  readonly count: number
  readonly at: Date
}

export function longestStreak(agents: AgentDay[]): Streak | null {
  return agents.reduce<Streak | null>((best, agent) => {
    let run = 0
    let prevTool = ''
    let localBest = best
    for (const event of agent.events) {
      run = event.tool === prevTool ? run + 1 : 1
      prevTool = event.tool
      if (run >= 3 && run > (localBest?.count ?? 2)) {
        localBest = { agent, tool: event.tool, count: run, at: event.ts }
      }
    }
    return localBest
  }, null)
}

function formatSpan(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

/**
 * Today's wrap-up. Works from the per-agent timelines (capped at 500 events
 * per agent), so a hyperactive agent's very early morning may fall off.
 */
export function computeRecap(stats: StatsStore, now: Date): Recap {
  const agents: AgentDay[] = stats.allAgents().map(([key, agentStats]) => ({
    key,
    label: agentStats.label,
    events: agentStats.events.filter((event) => sameDay(event.ts, now))
  }))
  const active = agents.filter((agent) => agent.events.length > 0)
  const totalCalls = active.reduce((sum, agent) => sum + agent.events.length, 0)

  const allTs = active.flatMap((agent) => agent.events.map((event) => event.ts.getTime()))
  const spanLabel = allTs.length > 0 ? formatSpan(Math.max(...allTs) - Math.min(...allTs)) : '0m'

  const badges: RecapBadge[] = []
  const worker = topBy(active, (agent) => agent.events.length)
  if (worker) badges.push({ icon: '🏆', title: 'Busiest agent', description: `${worker.agent.label} (${worker.value} calls)` })

  const streak = longestStreak(active)
  if (streak) {
    const hhmm = streak.at.toTimeString().slice(0, 5)
    badges.push({ icon: '🔥', title: 'Longest streak', description: `${streak.tool} ×${streak.count} in a row (${streak.agent.label}, ${hhmm})` })
  }

  const badgeRules: Array<readonly [RegExp, string, string]> = [
    [BASH_TOOLS, '🔨', 'Terminal expert'],
    [READ_TOOLS, '📚', 'Most reads'],
    [WRITE_TOOLS, '📜', 'Most writes'],
    [WEB_TOOLS, '🌐', 'Web explorer'],
    [DELEGATE_TOOLS, '🤖', 'Top delegator']
  ]
  badgeRules.forEach(([pattern, icon, title]) => {
    const top = topBy(active, (agent) => countMatching(agent, pattern))
    if (top) badges.push({ icon, title, description: `${top.agent.label} (${top.value} calls)` })
  })

  const quiet = agents.filter((agent) => agent.events.length === 0)
  if (quiet.length > 0 && active.length > 0) {
    badges.push({ icon: '🤫', title: 'Quiet day', description: quiet.map((agent) => agent.label).join(', ') })
  }

  return { totalCalls, activeAgents: active.length, spanLabel, badges }
}
