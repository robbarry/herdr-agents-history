export interface ToolEvent {
  readonly id: number
  readonly ts: Date
  readonly agentKey: string
  readonly agentLabel: string
  readonly agentKind: string
  readonly tool: string
  readonly detail: string
  readonly backfill: boolean
}

export interface AgentSnapshot {
  readonly key: string
  readonly paneId: string
  readonly label: string
  readonly kind: string
  readonly status: string
  readonly cwd: string
  readonly sessionId: string | null
}

export interface ParsedToolCall {
  readonly ts: string
  readonly tool: string
  readonly detail: string
}
