import { EventEmitter } from 'node:events'
import path from 'node:path'
import type { AgentSnapshot, ParsedOutput, ParsedToolCall, ToolEvent } from '../types.js'
import { parseClaudeLine, parseClaudeOutputLine } from './adapters/claude.js'
import { parseCodexLine, parseCodexOutputLine } from './adapters/codex.js'
import { listHerdrAgents } from './herdr.js'
import { SessionCache, defaultStateDir, resolveTranscript } from './sessions.js'
import { TranscriptTailer } from './tailer.js'

const AGENT_POLL_MS = 5_000
/** caps memory for long-running sessions; oldest outputs are evicted first (Map preserves insertion order) */
const OUTPUTS_LIMIT = 2_000

type LineParser = (line: string) => ParsedToolCall[]
type OutputParser = (line: string) => ParsedOutput[]

const PARSERS: Readonly<Record<string, LineParser>> = {
  claude: parseClaudeLine,
  codex: parseCodexLine
}

const OUTPUT_PARSERS: Readonly<Record<string, OutputParser>> = {
  claude: parseClaudeOutputLine,
  codex: parseCodexOutputLine
}

interface TrackedAgent {
  readonly snapshot: AgentSnapshot
  readonly tailer: TranscriptTailer | null
}

/**
 * Bridges herdr (which agents exist, their sessions) to the local transcript
 * files (what tools those sessions used). Emits:
 *   'events' (events: ToolEvent[])     — a batch of tool calls (one drain)
 *   'agents' (agents: AgentSnapshot[]) — refreshed agent list
 */
export class Collector extends EventEmitter {
  private readonly cache = new SessionCache(defaultStateDir())
  private tracked = new Map<string, TrackedAgent>()
  private pollTimer: NodeJS.Timeout | null = null
  private nextEventId = 1
  private stopped = false
  private readonly outputs = new Map<string, string>()

  start(): void {
    void this.sync()
    this.pollTimer = setInterval(() => void this.sync(), AGENT_POLL_MS)
  }

  stop(): void {
    this.stopped = true
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.tracked.forEach(({ tailer }) => tailer?.stop())
  }

  private async sync(): Promise<void> {
    let herdrAgents
    try {
      herdrAgents = await listHerdrAgents()
    } catch {
      return // herdr briefly unreachable; keep current state and retry
    }
    if (this.stopped) return

    const seen = new Set<string>()
    for (const agent of herdrAgents) {
      const kind = agent.agent_session?.agent ?? agent.agent ?? ''
      if (!(kind in PARSERS)) continue
      const key = agent.terminal_id
      seen.add(key)

      if (agent.agent_session?.value) {
        this.cache.remember(key, kind, agent.agent_session.value)
      }
      const session = this.cache.get(key)
      const snapshot: AgentSnapshot = {
        key,
        paneId: agent.pane_id ?? key,
        label: path.basename(agent.cwd ?? '') || kind,
        kind,
        status: agent.agent_status ?? 'unknown',
        cwd: agent.cwd ?? '',
        sessionId: session?.sessionId ?? null
      }

      const existing = this.tracked.get(key)
      if (existing && existing.snapshot.sessionId === snapshot.sessionId) {
        this.tracked.set(key, { ...existing, snapshot })
        continue
      }
      existing?.tailer?.stop()
      this.tracked.set(key, { snapshot, tailer: await this.startTailer(snapshot) })
    }

    for (const [key, { tailer }] of this.tracked) {
      if (!seen.has(key)) {
        tailer?.stop()
        this.tracked.delete(key)
      }
    }
    this.emit('agents', this.agents())
  }

  private async startTailer(snapshot: AgentSnapshot): Promise<TranscriptTailer | null> {
    if (!snapshot.sessionId) return null
    const transcript = await resolveTranscript(snapshot.kind, snapshot.sessionId)
    if (!transcript || this.stopped) return null

    const parse = PARSERS[snapshot.kind]
    const parseOutput = OUTPUT_PARSERS[snapshot.kind]
    const tailer = new TranscriptTailer(transcript, (lines, backfill) => {
      const events = lines.flatMap((line) => parse(line).map((call) => this.makeEvent(snapshot, call, backfill)))
      if (events.length > 0) this.emit('events', events)
      lines.forEach((line) => parseOutput(line).forEach((o) => this.recordOutput(o)))
    })
    void tailer.start()
    return tailer
  }

  private recordOutput(output: ParsedOutput): void {
    this.outputs.delete(output.toolUseId) // re-insert at the end so eviction stays LRU-ish
    this.outputs.set(output.toolUseId, output.output)
    if (this.outputs.size > OUTPUTS_LIMIT) {
      const oldest = this.outputs.keys().next().value
      if (oldest !== undefined) this.outputs.delete(oldest)
    }
  }

  /** The result text for a tool call, if its output has arrived yet. */
  getOutput(toolUseId: string | undefined): string | undefined {
    return toolUseId ? this.outputs.get(toolUseId) : undefined
  }

  private makeEvent(snapshot: AgentSnapshot, call: ParsedToolCall, backfill: boolean): ToolEvent {
    const parsed = Date.parse(call.ts)
    return {
      id: this.nextEventId++,
      ts: Number.isNaN(parsed) ? new Date() : new Date(parsed),
      agentKey: snapshot.key,
      agentLabel: snapshot.label,
      agentKind: snapshot.kind,
      kind: call.kind,
      tool: call.tool,
      detail: call.detail.replace(/\s+/g, ' ').trim(),
      raw: call.raw,
      toolUseId: call.toolUseId,
      backfill
    }
  }

  agents(): AgentSnapshot[] {
    return [...this.tracked.values()].map(({ snapshot }) => snapshot)
  }
}
