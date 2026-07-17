import { describe, expect, it } from 'vitest'
import { formatDetail, formatTime, padDisplay, wrapText } from './format.js'

const HOME = '/Users/ray'
const CWD = '/Users/ray/dev/my-app'

describe('formatDetail', () => {
  it('shortens paths inside the agent cwd to relative form', () => {
    expect(formatDetail(`${CWD}/src/pages/HomePage.tsx`, CWD, 60, HOME)).toBe('src/pages/HomePage.tsx')
  })

  it('shortens home paths outside the cwd to ~/', () => {
    expect(formatDetail(`${HOME}/.claude/settings.json`, CWD, 60, HOME)).toBe('~/.claude/settings.json')
  })

  it('keeps the tail (filename) when a path must be truncated', () => {
    const result = formatDetail(`${CWD}/src/deeply/nested/dir/Component.tsx`, '', 20, HOME)
    expect(result).toHaveLength(20)
    expect(result.startsWith('…')).toBe(true)
    expect(result.endsWith('Component.tsx')).toBe(true)
  })

  it('keeps the head when a command must be truncated', () => {
    const result = formatDetail('npx vitest run src/pages/HomePage.test.tsx', '', 20, HOME)
    expect(result).toBe('npx vitest run src/…')
  })
})

describe('formatTime', () => {
  const now = new Date('2026-07-17T13:30:00')

  it('shows the time for same-day events', () => {
    expect(formatTime(new Date('2026-07-17T13:11:21'), now).trimEnd()).toBe('13:11:21')
  })

  it('shows the date for older events', () => {
    expect(formatTime(new Date('2026-07-06T16:10:02'), now)).toBe('07-06 16:10')
  })
})

describe('wrapText', () => {
  it('preserves existing newlines and wraps each line independently', () => {
    expect(wrapText('short\nline', 20)).toEqual(['short', 'line'])
  })

  it('wraps a long line at the given width', () => {
    expect(wrapText('a'.repeat(25), 10)).toEqual(['a'.repeat(10), 'a'.repeat(10), 'a'.repeat(5)])
  })

  it('keeps blank lines intact', () => {
    expect(wrapText('a\n\nb', 10)).toEqual(['a', '', 'b'])
  })

  it('counts CJK characters as double-width so Korean text wraps narrower', () => {
    // 10 Korean characters at width 10 must wrap after 5 (each is 2 columns wide)
    const korean = '가나다라마바사아자차'
    const wrapped = wrapText(korean, 10)
    expect(wrapped).toEqual(['가나다라마', '바사아자차'])
  })

  it('never produces empty output for non-empty input', () => {
    expect(wrapText('x', 10).length).toBeGreaterThan(0)
  })
})

describe('padDisplay', () => {
  it('pads ASCII text to the target column width', () => {
    expect(padDisplay('abc', 6)).toBe('abc   ')
  })

  it('counts CJK characters as two columns when padding', () => {
    // '가나' is 4 columns wide → 2 spaces to reach 6
    expect(padDisplay('가나', 6)).toBe('가나  ')
  })

  it('counts emoji as two columns so a highlighted row lines up', () => {
    // '💻' is 2 columns wide → 4 spaces to reach 6
    expect(padDisplay('💻', 6)).toBe('💻    ')
  })

  it('leaves the arrow ornaments as single-width', () => {
    // ▸ and ❯ are not emoji → 1 column each
    expect(padDisplay('▸❯', 5)).toBe('▸❯   ')
  })

  it('does not pad when already at or over width', () => {
    expect(padDisplay('abcdef', 3)).toBe('abcdef')
  })
})
