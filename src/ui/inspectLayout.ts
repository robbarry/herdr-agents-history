import type { FeedGroup } from '../collapse.js'
import type { ToolEvent } from '../types.js'
import { wrapText } from './format.js'

export interface InspectLayout {
  /** rows consumed by the fixed header (title, meta, constituents list) */
  readonly headerLines: number
  /** the raw content (tool input / prompt), pre-wrapped to the content width */
  readonly rawLines: string[]
  /** remaining rows available for scrolling through rawLines */
  readonly rawAreaHeight: number
}

const CONSTITUENTS_SHOWN = 8

/**
 * Line-accounting for the Inspect view, shared by the App (to clamp scroll
 * bounds) and the Inspect component (to actually render) so the two can
 * never drift out of sync.
 */
export function computeInspectLayout(
  group: FeedGroup,
  constituents: readonly ToolEvent[],
  width: number,
  height: number
): InspectLayout {
  const { event, count } = group
  const isTurn = event.kind === 'turn'

  let headerLines = 2 // title + divider
  headerLines += 2 // agent row + time row
  if (!isTurn && event.detail.length > 0) headerLines += 1
  if (count > 1) {
    headerLines += 2 + Math.min(constituents.length, CONSTITUENTS_SHOWN)
    if (constituents.length > CONSTITUENTS_SHOWN) headerLines += 1
  }
  if (event.raw) headerLines += 2 // divider + "input:"/"prompt 전문:" label

  const contentWidth = Math.max(width - 4 - 2, 10) // paddingX(2)*2, scrollbar gutter
  const rawLines = event.raw ? wrapText(event.raw, contentWidth) : []

  // reserve one row for the "N more lines" indicator, but only when it's
  // actually needed — otherwise scrolling never engages and the reservation
  // would just leave a dead blank line at the bottom. When space is so tight
  // that even the indicator barely fits, rawAreaHeight degrades to 0 (content
  // rows disappear, only the indicator shows) rather than overflowing the
  // container — the total (headerLines + rawAreaHeight + indicator row) must
  // never exceed `height`, so this must not be floored back up to 1.
  const naiveHeight = Math.max(height - headerLines, 1)
  const needsIndicator = rawLines.length > naiveHeight
  const rawAreaHeight = needsIndicator ? naiveHeight - 1 : naiveHeight

  return { headerLines, rawLines, rawAreaHeight }
}
