import type { FeedGroup } from '../collapse.js'
import type { ToolEvent } from '../types.js'
import { formatTime, wrapText } from './format.js'

export interface ConstituentPreview {
  readonly id: number
  /** fixed-width time prefix ("HH:MM:SS" or "MM-DD HH:MM"), shown once per item */
  readonly time: string
  /** wrapped detail lines — only the first is prefixed with `time` when rendered */
  readonly lines: string[]
}

export interface BodyLine {
  readonly text: string
  /** section headings ("input:", "output:", "full prompt:") get distinct styling */
  readonly isLabel: boolean
}

export interface InspectLayout {
  /** rows consumed by title/meta/constituents — used to size the header before bodyLines */
  readonly headerLines: number
  /** the "detail" field, wrapped to the row's content width (empty if not shown) */
  readonly detailLines: string[]
  /** last-N constituent calls, each pre-wrapped so full commands are never cut */
  readonly constituentPreviews: ConstituentPreview[]
  /** count of older constituents beyond what constituentPreviews shows */
  readonly constituentOverflow: number
  /** tool input and, once available, its output */
  readonly bodyLines: BodyLine[]
  /** headerLines + bodyLines.length — the view's full row count before windowing */
  readonly totalLines: number
  /** rows actually visible at once (whole view scrolls together, not just the body) */
  readonly visibleHeight: number
}

const CONSTITUENTS_SHOWN = 8
const LABEL_WIDTH = 10
/** formatTime always returns exactly 11 chars, plus 2 literal spaces after it */
const TIME_PREFIX_WIDTH = 13

function textLines(lines: string[]): BodyLine[] {
  return lines.map((text) => ({ text, isLabel: false }))
}

/**
 * Line-accounting for the Inspect view, shared by the App (to clamp scroll
 * bounds) and the Inspect component (to actually render) so the two can
 * never drift out of sync. Long text (a full shell command, a wide detail
 * string, tool input/output) is wrapped here — not truncated with an
 * ellipsis — so nothing is ever hidden.
 *
 * The whole view scrolls as one unit (title down through input/output) —
 * there's no separate fixed header, so a call with many collapsed
 * constituents or a long detail line scrolls away just like the body does.
 */
export function computeInspectLayout(
  group: FeedGroup,
  constituents: readonly ToolEvent[],
  width: number,
  height: number,
  now: Date,
  output?: string
): InspectLayout {
  const { event, count } = group
  const isTurn = event.kind === 'turn'
  const contentWidth = Math.max(width - 4 - 2, 10) // paddingX(2)*2, scrollbar gutter

  let headerLines = 2 // title + divider
  headerLines += 2 // agent row + time row

  const detailLines =
    !isTurn && event.detail.length > 0 ? wrapText(event.detail, Math.max(contentWidth - LABEL_WIDTH, 10)) : []
  headerLines += detailLines.length

  let constituentPreviews: ConstituentPreview[] = []
  let constituentOverflow = 0
  if (count > 1) {
    const shown = constituents.slice(-CONSTITUENTS_SHOWN)
    constituentOverflow = Math.max(constituents.length - CONSTITUENTS_SHOWN, 0)
    const constituentWidth = Math.max(contentWidth - TIME_PREFIX_WIDTH, 10)
    constituentPreviews = shown.map((item) => ({
      id: item.id,
      time: formatTime(item.ts, now),
      lines: wrapText(item.detail || '(no detail)', constituentWidth)
    }))
    headerLines += 2 // divider + "Consecutive calls: N" label
    headerLines += constituentPreviews.reduce((sum, p) => sum + p.lines.length, 0)
    if (constituentOverflow > 0) headerLines += 1
  }

  // input and output share one region, each introduced by its own label line
  const bodyLines: BodyLine[] = []
  if (event.raw) {
    bodyLines.push({ text: isTurn ? 'full prompt:' : 'input:', isLabel: true })
    bodyLines.push(...textLines(wrapText(event.raw, contentWidth)))
  }
  if (output && output.length > 0) {
    if (bodyLines.length > 0) bodyLines.push({ text: '', isLabel: false })
    bodyLines.push({ text: 'output:', isLabel: true })
    bodyLines.push(...textLines(wrapText(output, contentWidth)))
  }
  if (bodyLines.length > 0) headerLines += 1 // one divider before input/output

  const totalLines = headerLines + bodyLines.length

  // reserve one row for the "N more lines" indicator, but only when it's
  // actually needed — otherwise scrolling never engages and the reservation
  // would just leave a dead blank line at the bottom. This must not be
  // floored up to any minimum: with enough collapsed constituents, totalLines
  // can exceed `height` outright, and forcing extra rows here would push the
  // total past `height`, bleeding into whatever renders below (the app
  // footer) — a real bug this kind of floor caused before, guarded by tests.
  const needsIndicator = totalLines > height
  const visibleHeight = needsIndicator ? Math.max(height - 1, 0) : height

  return { headerLines, detailLines, constituentPreviews, constituentOverflow, bodyLines, totalLines, visibleHeight }
}
