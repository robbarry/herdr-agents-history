import os from 'node:os'

/**
 * Make a tool-call detail fit the column while keeping the informative part:
 * paths get cwd/home-relative shortening and keep their tail (the filename),
 * commands keep their head.
 */
export function formatDetail(detail: string, cwd: string, width: number, home: string = os.homedir()): string {
  const isPath = detail.startsWith('/') || detail.startsWith('~/')
  const shortened = isPath ? shortenPath(detail, cwd, home) : detail
  if (shortened.length <= width) return shortened
  return isPath ? `…${shortened.slice(-(width - 1))}` : `${shortened.slice(0, width - 1)}…`
}

function shortenPath(path: string, cwd: string, home: string): string {
  if (cwd.length > 0 && path.startsWith(`${cwd}/`)) return path.slice(cwd.length + 1)
  if (path === cwd) return '.'
  if (path.startsWith(`${home}/`)) return `~/${path.slice(home.length + 1)}`
  return path
}

const WIDE_CHAR = /[ᄀ-ᅟ㐀-꓏가-힣豈-﫿︰-﹏＀-￯]/

// tool icons render two columns wide, like CJK glyphs. The ornament arrows
// we use (▸ ❯ ●) are NOT Extended_Pictographic, so they stay one column.
const EMOJI = /\p{Extended_Pictographic}/u

/** Display width of one character — CJK glyphs and emoji render two terminal columns wide. */
function charWidth(ch: string): number {
  return WIDE_CHAR.test(ch) || EMOJI.test(ch) ? 2 : 1
}

function displayWidth(text: string): number {
  return [...text].reduce((sum, ch) => sum + charWidth(ch), 0)
}

/** Pad to a display width, counting wide (CJK) characters as two columns. */
export function padDisplay(text: string, width: number): string {
  return text + ' '.repeat(Math.max(width - displayWidth(text), 0))
}

/**
 * Word-wrap free-form text (tool input JSON, prompt bodies) to a display
 * width, preserving existing newlines. Wraps by character rather than word
 * since content is often mixed Korean/English — CJK text has no natural word
 * boundaries, so character wrapping (with CJK counted as 2 columns) is the
 * one strategy that works for both without special-casing either.
 */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return text.split('\n')
  return text.split('\n').flatMap((line) => wrapLine(line, width))
}

function wrapLine(line: string, width: number): string[] {
  const chars = [...line]
  if (chars.length === 0) return ['']
  const out: string[] = []
  let current = ''
  let currentWidth = 0
  for (const ch of chars) {
    const w = charWidth(ch)
    if (currentWidth + w > width && current.length > 0) {
      out.push(current)
      current = ''
      currentWidth = 0
    }
    current += ch
    currentWidth += w
  }
  out.push(current)
  return out
}

/** Today's events show the time; older backfill shows the date so it can't pass for recent. */
export function formatTime(ts: Date, now: Date): string {
  const sameDay =
    ts.getFullYear() === now.getFullYear() && ts.getMonth() === now.getMonth() && ts.getDate() === now.getDate()
  if (sameDay) return ts.toTimeString().slice(0, 8).padEnd(11)
  const mm = String(ts.getMonth() + 1).padStart(2, '0')
  const dd = String(ts.getDate()).padStart(2, '0')
  return `${mm}-${dd} ${ts.toTimeString().slice(0, 5)}`
}
