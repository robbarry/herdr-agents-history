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
  it('wraps input to the content width and fits without an indicator when it fits', () => {
    const event = toolEvent({ raw: 'a short input' })
    const layout = computeInspectLayout(group(event), [], 80, 30, NOW)
    expect(layout.bodyLines.map((l) => l.text)).toEqual(['input:', 'a short input'])
    expect(layout.bodyLines[0].isLabel).toBe(true)
    expect(layout.bodyLines[1].isLabel).toBe(false)
    // plenty of room: the whole view (header + body) fits with no indicator reserved
    expect(layout.totalLines).toBe(layout.headerLines + layout.bodyLines.length)
    expect(layout.visibleHeight).toBe(30)
  })

  it('appends output after input as one unified body, with its own label', () => {
    const event = toolEvent({ raw: 'the input' })
    const layout = computeInspectLayout(group(event), [], 80, 30, NOW, 'the output')
    expect(layout.bodyLines.map((l) => l.text)).toEqual(['input:', 'the input', '', 'output:', 'the output'])
    expect(layout.bodyLines.filter((l) => l.isLabel).map((l) => l.text)).toEqual(['input:', 'output:'])
  })

  it('shows output on its own even when there is no input to precede it', () => {
    const event = toolEvent({ raw: undefined })
    const layout = computeInspectLayout(group(event), [], 80, 30, NOW, 'solo output')
    expect(layout.bodyLines.map((l) => l.text)).toEqual(['output:', 'solo output'])
  })

  it('reserves one row for the "more" indicator only when the whole view overflows the given height', () => {
    const raw = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    const event = toolEvent({ raw })
    const height = 20
    const layout = computeInspectLayout(group(event), [], 80, height, NOW)
    expect(layout.bodyLines).toHaveLength(51) // 'input:' label + 50 lines
    expect(layout.totalLines).toBeGreaterThan(height)
    expect(layout.visibleHeight).toBe(height - 1)
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

  it('degrades visibleHeight toward 0 rather than overflowing the container when space is extremely tight', () => {
    const height = 2
    const event = toolEvent({ raw: 'x'.repeat(5000) })
    const layout = computeInspectLayout(group(event), [], 80, height, NOW)
    expect(layout.visibleHeight).toBeGreaterThanOrEqual(0)
    // the whole rendered view (visible rows + the 1 reserved indicator row,
    // when shown) must never exceed the given height
    const needsIndicator = layout.totalLines > layout.visibleHeight
    expect(layout.visibleHeight + (needsIndicator ? 1 : 0)).toBeLessThanOrEqual(height)
  })

  it('never lets visibleHeight go negative', () => {
    const event = toolEvent({ raw: 'x'.repeat(5000) })
    const layout = computeInspectLayout(group(event), [], 80, 1, NOW)
    expect(layout.visibleHeight).toBeGreaterThanOrEqual(0)
  })

  it('reproduces the tight-space case observed in the running plugin: 3 collapsed calls + detail + input in a 13-row view', () => {
    // 3 collapsed calls + a detail row + input — enough header content alone
    // to fill (or exceed) the given height. The whole view (header included)
    // must still never render more rows than fit, indicator included.
    const collapsed = toolEvent({ id: 3, raw: Array.from({ length: 5 }, (_, i) => `line ${i}`).join('\n') })
    const constituents = [toolEvent({ id: 1 }), toolEvent({ id: 2 }), collapsed]
    const height = 13
    const layout = computeInspectLayout(group(collapsed, 3), constituents, 100, height, NOW)
    expect(layout.headerLines).toBe(11)
    const needsIndicator = layout.totalLines > layout.visibleHeight
    expect(layout.visibleHeight + (needsIndicator ? 1 : 0)).toBeLessThanOrEqual(height)
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

  it('wraps a long output instead of truncating it', () => {
    const longOutput = Array.from({ length: 40 }, (_, i) => `output line ${i}`).join('\n')
    const event = toolEvent({ raw: 'cmd' })
    const layout = computeInspectLayout(group(event), [], 80, 15, NOW, longOutput)
    const outputStart = layout.bodyLines.findIndex((l) => l.text === 'output:')
    expect(outputStart).toBeGreaterThan(-1)
    expect(layout.bodyLines.slice(outputStart + 1).map((l) => l.text)).toEqual(longOutput.split('\n'))
  })

  it('totalLines always equals headerLines + bodyLines.length', () => {
    const event = toolEvent({ raw: 'x'.repeat(500), detail: 'y'.repeat(200) })
    const constituents = Array.from({ length: 5 }, (_, i) => toolEvent({ id: i + 1 }))
    const layout = computeInspectLayout(group(event, 5), constituents, 70, 25, NOW, 'z'.repeat(300))
    expect(layout.totalLines).toBe(layout.headerLines + layout.bodyLines.length)
  })
})
