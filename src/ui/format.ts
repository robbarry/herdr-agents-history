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

/** Pad to a display width, counting wide (CJK) characters as two columns. */
export function padDisplay(text: string, width: number): string {
  const displayWidth = [...text].reduce(
    (sum, ch) => sum + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1),
    0
  )
  return text + ' '.repeat(Math.max(width - displayWidth, 0))
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
