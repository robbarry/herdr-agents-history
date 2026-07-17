import type { ToolEvent } from './types.js'

export const BUFFER_LIMIT = 1_000

/**
 * Append a batch of events to the feed buffer in one pass, capped at
 * BUFFER_LIMIT. Backfill batches (a whole transcript read at once) are
 * merge-sorted by timestamp so events from different agents interleave
 * correctly; live batches are already newest-last and just append.
 *
 * Doing this per-batch instead of per-event is what keeps startup cheap:
 * one array build + one sort per agent, rather than an O(n) insert (and an
 * O(n) React update) for every one of thousands of historical events.
 */
export function insertEvents(events: ToolEvent[], batch: readonly ToolEvent[]): ToolEvent[] {
  if (batch.length === 0) return events
  const next = batch[0].backfill
    ? [...events, ...batch].sort((a, b) => a.ts.getTime() - b.ts.getTime() || a.id - b.id)
    : [...events, ...batch]
  return next.length > BUFFER_LIMIT ? next.slice(-BUFFER_LIMIT) : next
}
