import { describe, expect, it } from 'vitest'
import { formatDetail, formatTime } from './format.js'

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
