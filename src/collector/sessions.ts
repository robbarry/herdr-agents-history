import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const HOME = os.homedir()

/** Locate the native transcript file for an agent session. */
export async function resolveTranscript(kind: string, sessionId: string): Promise<string | null> {
  if (kind === 'claude') {
    const projectsDir = path.join(HOME, '.claude', 'projects')
    const dirs = await safeReaddir(projectsDir)
    const hit = dirs
      .map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`))
      .find((candidate) => fs.existsSync(candidate))
    return hit ?? null
  }
  if (kind === 'codex') {
    const sessionsDir = path.join(HOME, '.codex', 'sessions')
    const entries = await safeReaddir(sessionsDir, true)
    const hit = entries.find((entry) => entry.endsWith('.jsonl') && entry.includes(sessionId))
    return hit ? path.join(sessionsDir, hit) : null
  }
  return null
}

async function safeReaddir(dir: string, recursive = false): Promise<string[]> {
  try {
    return await fsp.readdir(dir, { recursive })
  } catch {
    return []
  }
}

interface CachedSession {
  readonly kind: string
  readonly sessionId: string
}

/**
 * herdr drops `agent_session` from idle panes after a TTL (observed in the PoC),
 * so remember the last session id seen per terminal.
 */
export class SessionCache {
  private readonly file: string
  private sessions: Record<string, CachedSession> = {}

  constructor(stateDir: string) {
    this.file = path.join(stateDir, 'sessions.json')
    try {
      this.sessions = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, CachedSession>
    } catch {
      this.sessions = {}
    }
  }

  get(terminalId: string): CachedSession | undefined {
    return this.sessions[terminalId]
  }

  remember(terminalId: string, kind: string, sessionId: string): void {
    const existing = this.sessions[terminalId]
    if (existing?.sessionId === sessionId && existing?.kind === kind) return
    this.sessions = { ...this.sessions, [terminalId]: { kind, sessionId } }
    this.persist()
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      fs.writeFileSync(this.file, JSON.stringify(this.sessions, null, 2))
    } catch {
      // state dir may be unwritable; cache then lives in memory only
    }
  }
}

export function defaultStateDir(): string {
  return (
    process.env['HERDR_PLUGIN_STATE_DIR'] ??
    path.join(HOME, '.local', 'state', 'herdr-agent-tool-history')
  )
}
