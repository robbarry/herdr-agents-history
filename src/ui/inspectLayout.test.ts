import { describe, expect, it } from 'vitest'
import { computeInspectLayout } from './inspectLayout.js'
import type { FeedGroup } from '../collapse.js'
import type { ToolEvent } from '../types.js'

function toolEvent(overrides: Partial<ToolEvent>): ToolEvent {
  return {
    id: 1,
    ts: new Date('2026-07-17T13:00:00Z'),
    agentKey: 'a',
    agentLabel: 'my-app',
    agentKind: 'claude',
    kind: 'tool',
    tool: 'Bash',
    detail: 'npm test',
    backfill: false,
    ...overrides
  }
}

function group(event: ToolEvent, count = 1): FeedGroup {
  return { event, firstId: event.id, count }
}

const NOW = new Date('2026-07-17T13:00:00Z')

describe('computeInspectLayout', () => {
  it('wraps raw content to the content width and fits without an indicator when it fits', () => {
    const event = toolEvent({ raw: 'a short input' })
    const layout = computeInspectLayout(group(event), [], 80, 30, NOW)
    expect(layout.rawLines).toEqual(['a short input'])
    // plenty of room: rawAreaHeight should equal the naive remaining height (no reserved indicator row)
    expect(layout.rawAreaHeight).toBe(30 - layout.headerLines)
  })

  it('reserves one row for the "more" indicator only when scrolling is actually needed', () => {
    const raw = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    const event = toolEvent({ raw })
    const height = 20
    const layout = computeInspectLayout(group(event), [], 80, height, NOW)
    expect(layout.rawLines).toHaveLength(50)
    // naive height would be height-headerLines; since 50 lines overflow that,
    // one row must be reserved for the indicator
    const naive = height - layout.headerLines
    expect(layout.rawAreaHeight).toBe(naive - 1)
  })

  it('accounts for the constituents list and detail row in headerLines', () => {
    const solo = toolEvent({ raw: 'x' })
    const soloLayout = computeInspectLayout(group(solo, 1), [], 80, 30, NOW)

    const constituents = [toolEvent({ id: 1 }), toolEvent({ id: 2 }), toolEvent({ id: 3 })]
    const collapsed = toolEvent({ id: 3, raw: 'x' })
    const groupLayout = computeInspectLayout(group(collapsed, 3), constituents, 80, 30, NOW)

    // a collapsed group with a constituents list needs strictly more header rows
    expect(groupLayout.headerLines).toBeGreaterThan(soloLayout.headerLines)
  })

  it('degrades to 0 content rows (indicator only) rather than overflowing the container when space is extremely tight', () => {
    const height = 2
    const event = toolEvent({ raw: 'x'.repeat(5000) })
    const layout = computeInspectLayout(group(event), [], 80, height, NOW)
    expect(layout.rawAreaHeight).toBe(0)
    // header + content rows + the 1 reserved indicator row must never exceed the given height
    expect(layout.headerLines + layout.rawAreaHeight + 1).toBeLessThanOrEqual(Math.max(height, layout.headerLines + 1))
  })

  it('never lets rawAreaHeight go negative', () => {
    const event = toolEvent({ raw: 'x'.repeat(5000) })
    const layout = computeInspectLayout(group(event), [], 80, 1, NOW)
    expect(layout.rawAreaHeight).toBeGreaterThanOrEqual(0)
  })

  it('reproduces the exact tight-space case observed in the running plugin: 12 header rows in a 13-row body', () => {
    // 3 collapsed calls + a detail row + raw content — this combination used
    // to force rawAreaHeight back up to 1 even though only 1 row of budget
    // remained after the header, overflowing the container by one row.
    const collapsed = toolEvent({ id: 3, raw: Array.from({ length: 5 }, (_, i) => `line ${i}`).join('\n') })
    const constituents = [toolEvent({ id: 1 }), toolEvent({ id: 2 }), collapsed]
    const layout = computeInspectLayout(group(collapsed, 3), constituents, 100, 13, NOW)
    expect(layout.headerLines).toBe(12)
    expect(layout.rawAreaHeight).toBe(0)
  })

  it('wraps a long detail (a full shell command) instead of truncating it with an ellipsis', () => {
    const longCommand = 'echo ' + 'x'.repeat(300)
    const event = toolEvent({ detail: longCommand })
    const layout = computeInspectLayout(group(event), [], 80, 30, NOW)
    expect(layout.detailLines.join('')).toBe(longCommand)
    expect(layout.detailLines.length).toBeGreaterThan(1)
  })

  it('wraps long constituent commands too and reports overflow beyond the last 8', () => {
    const longCommand = 'x'.repeat(200)
    const constituents = Array.from({ length: 10 }, (_, i) => toolEvent({ id: i + 1, detail: longCommand }))
    const collapsed = constituents[constituents.length - 1]
    const layout = computeInspectLayout(group(collapsed, 10), constituents, 80, 60, NOW)
    expect(layout.constituentPreviews).toHaveLength(8)
    expect(layout.constituentOverflow).toBe(2)
    expect(layout.constituentPreviews[0].lines.join('')).toBe(longCommand)
    expect(layout.constituentPreviews[0].lines.length).toBeGreaterThan(1)
  })
})
