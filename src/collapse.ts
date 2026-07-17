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

/** Index of the bottom visible group: the anchored group, or the newest when live. */
export function bottomIndexFor(groups: readonly FeedGroup[], anchor: number | null): number {
  if (anchor === null) return groups.length - 1
  const index = groups.findIndex((group) => group.firstId === anchor)
  return index === -1 ? groups.length - 1 : index
}
