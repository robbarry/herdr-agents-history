import fs from 'node:fs'
import fsp from 'node:fs/promises'

/**
 * Tails a jsonl file: emits every existing line once, then appended lines as
 * they arrive. fs.watch is the fast path; a slow stat poll covers editors and
 * filesystems that drop watch events.
 */
export class TranscriptTailer {
  private offset = 0
  private remainder = ''
  private watcher: fs.FSWatcher | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private reading = false
  private stopped = false

  constructor(
    private readonly filePath: string,
    // one call per drain carrying every non-blank line read, so consumers can
    // process a whole transcript (or a poll's worth of appends) as one batch
    private readonly onLines: (lines: string[], backfill: boolean) => void
  ) {}

  async start(): Promise<void> {
    await this.drain(true)
    if (this.stopped) return
    try {
      this.watcher = fs.watch(this.filePath, () => void this.drain(false))
    } catch {
      // file may have rotated away; the poll below still handles it
    }
    this.pollTimer = setInterval(() => void this.drain(false), 2_000)
  }

  stop(): void {
    this.stopped = true
    this.watcher?.close()
    if (this.pollTimer) clearInterval(this.pollTimer)
  }

  private async drain(backfill: boolean): Promise<void> {
    if (this.reading || this.stopped) return
    this.reading = true
    try {
      const stat = await fsp.stat(this.filePath)
      if (stat.size < this.offset) {
        this.offset = 0
        this.remainder = ''
      }
      if (stat.size > this.offset) {
        const handle = await fsp.open(this.filePath, 'r')
        try {
          const length = stat.size - this.offset
          const buffer = Buffer.alloc(length)
          await handle.read(buffer, 0, length, this.offset)
          this.offset = stat.size
          const chunk = this.remainder + buffer.toString('utf8')
          const lines = chunk.split('\n')
          this.remainder = lines.pop() ?? ''
          const kept = lines.filter((line) => line.trim().length > 0)
          if (kept.length > 0) this.onLines(kept, backfill)
        } finally {
          await handle.close()
        }
      }
    } catch {
      // transient stat/read failures are retried by the next poll tick
    } finally {
      this.reading = false
    }
  }
}
