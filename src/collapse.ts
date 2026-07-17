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
 * Scroll the window by the minimum amount needed to keep focusIndex visible.
 * If focus is already inside [windowBottom - listHeight + 1, windowBottom],
 * the window does not move — only the highlighted row changes. The window
 * only shifts once focus would move past its near edge (top or bottom),
 * revealing exactly one more row at that edge.
 */
export function clampWindow(focusIndex: number, windowBottom: number, listHeight: number, lastIndex: number): number {
  const windowStart = Math.max(windowBottom - listHeight + 1, 0)
  if (focusIndex > windowBottom) return Math.min(focusIndex, lastIndex)
  if (focusIndex < windowStart) return Math.min(focusIndex + listHeight - 1, lastIndex)
  return Math.min(windowBottom, lastIndex)
}
