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
  /** full tool input (pretty JSON) or full prompt — shown in the inspect view */
  readonly raw?: string
  /** correlation id for matching this call to its result (claude: tool_use.id, codex: call_id) */
  readonly toolUseId?: string
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
  readonly raw?: string
  readonly toolUseId?: string
}

/** A tool's result, parsed separately from its call and correlated by toolUseId. */
export interface ParsedOutput {
  readonly ts: string
  readonly toolUseId: string
  readonly output: string
}
