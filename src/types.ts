export interface ToolEvent {
  readonly id: number
  readonly ts: Date
  readonly agentKey: string
  readonly agentLabel: string
  readonly agentKind: string
  /** 'tool' = a tool call; 'turn' = a new user prompt (conversation-turn boundary) */
  readonly kind: 'tool' | 'turn'
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
  readonly kind: 'tool' | 'turn'
  readonly tool: string
  readonly detail: string
}
