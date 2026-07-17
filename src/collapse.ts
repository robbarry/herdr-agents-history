import type { ToolEvent } from './types.js'

export interface FeedGroup {
  /** last event of the group — carries the display timestamp and detail */
  readonly event: ToolEvent
  /** id of the group's first event; stable, used as the scroll anchor */
  readonly firstId: number
  readonly count: number
}

/**
 * Collapse consecutive calls of the same tool by the same agent into one row.
 * Turn boundaries are never collapsed and also break a run.
 */
export function collapseEvents(events: readonly ToolEvent[]): FeedGroup[] {
  return events.reduce<FeedGroup[]>((groups, event) => {
    const last = groups[groups.length - 1]
    if (
      last &&
      event.kind === 'tool' &&
      last.event.kind === 'tool' &&
      last.event.agentKey === event.agentKey &&
      last.event.tool === event.tool
    ) {
      return [...groups.slice(0, -1), { event, firstId: last.firstId, count: last.count + 1 }]
    }
    return [...groups, { event, firstId: event.id, count: 1 }]
  }, [])
}

/** Index of the focused group, or null when live-following (focus lost → live). */
export function focusIndexFor(groups: readonly FeedGroup[], focusId: number | null): number | null {
  if (focusId === null) return null
  const index = groups.findIndex((group) => group.firstId === focusId)
  return index === -1 ? null : index
}

/**
 * Bottom row of the visible window. Live mode follows the newest group; a
 * focused row sits at the window bottom, except near the top where the window
 * pins to the start so it stays full.
 */
export function windowBottom(groups: readonly FeedGroup[], focusIndex: number | null, listHeight: number): number {
  if (focusIndex === null) return groups.length - 1
  return Math.max(focusIndex, Math.min(listHeight - 1, groups.length - 1))
}
