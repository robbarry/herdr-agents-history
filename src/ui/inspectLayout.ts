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
  /** section headings ("input:", "output:", "prompt 전문:") get distinct styling */
  readonly isLabel: boolean
}

export interface InspectLayout {
  /** rows consumed by the fixed header (title, meta, constituents list) */
  readonly headerLines: number
  /** the "detail" field, wrapped to the row's content width (empty if not shown) */
  readonly detailLines: string[]
  /** last-N constituent calls, each pre-wrapped so full commands are never cut */
  readonly constituentPreviews: ConstituentPreview[]
  /** count of older constituents beyond what constituentPreviews shows */
  readonly constituentOverflow: number
  /** tool input and, once available, its output — one unified scrollable region */
  readonly bodyLines: BodyLine[]
  /** remaining rows available for scrolling through bodyLines */
  readonly bodyAreaHeight: number
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
 * ellipsis — so nothing is ever hidden; every wrapped line is counted into
 * headerLines/bodyAreaHeight so the layout is sized correctly and never
 * overflows the container.
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
    headerLines += 2 // divider + "연속 호출 N회:" label
    headerLines += constituentPreviews.reduce((sum, p) => sum + p.lines.length, 0)
    if (constituentOverflow > 0) headerLines += 1
  }

  // input and output share one scrollable region, each introduced by its own
  // label line — this keeps a single scrollbar/indicator instead of two
  const bodyLines: BodyLine[] = []
  if (event.raw) {
    bodyLines.push({ text: isTurn ? 'prompt 전문:' : 'input:', isLabel: true })
    bodyLines.push(...textLines(wrapText(event.raw, contentWidth)))
  }
  if (output && output.length > 0) {
    if (bodyLines.length > 0) bodyLines.push({ text: '', isLabel: false })
    bodyLines.push({ text: 'output:', isLabel: true })
    bodyLines.push(...textLines(wrapText(output, contentWidth)))
  }
  if (bodyLines.length > 0) headerLines += 1 // one divider before the scrollable body

  // reserve one row for the "N more lines" indicator, but only when it's
  // actually needed — otherwise scrolling never engages and the reservation
  // would just leave a dead blank line at the bottom. When space is so tight
  // that even the indicator barely fits, bodyAreaHeight degrades to 0 (content
  // rows disappear, only the indicator shows) rather than overflowing the
  // container — the total (headerLines + bodyAreaHeight + indicator row) must
  // never exceed `height`, so naiveHeight must NOT be floored up to 1: with a
  // header this tall (e.g. many collapsed constituents), height - headerLines
  // can legitimately be 0 or negative, and forcing it to 1 pushed the total
  // one row past `height`, bleeding into whatever renders below (the app
  // footer) — a real bug this floor caused and that these tests guard against.
  const naiveHeight = Math.max(height - headerLines, 0)
  const needsIndicator = naiveHeight > 0 && bodyLines.length > naiveHeight
  const bodyAreaHeight = needsIndicator ? naiveHeight - 1 : naiveHeight

  return { headerLines, detailLines, constituentPreviews, constituentOverflow, bodyLines, bodyAreaHeight }
}
