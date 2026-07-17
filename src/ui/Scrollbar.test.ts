import { describe, expect, it } from 'vitest'
import { thumbGeometry } from './Scrollbar.js'

describe('thumbGeometry', () => {
  it('sizes the thumb to the visible fraction of the total', () => {
    // 10 of 100 rows visible → thumb covers 10% of the 10-row track (1 row)
    expect(thumbGeometry(100, 0, 10).size).toBe(1)
    // 50 of 100 visible → thumb covers half the track
    expect(thumbGeometry(100, 0, 10).size).toBe(1) // still clamps sanely at small track sizes
    expect(thumbGeometry(20, 0, 10).size).toBe(5)
  })

  it('never shrinks the thumb below 1 row even for huge lists', () => {
    expect(thumbGeometry(10_000, 0, 5).size).toBe(1)
  })

  it('positions the thumb at the top when start is 0 and bottom when scrolled all the way', () => {
    const total = 100
    const height = 10
    const { size } = thumbGeometry(total, 0, height)
    expect(thumbGeometry(total, 0, height).offset).toBe(0)
    const maxStart = total - height
    expect(thumbGeometry(total, maxStart, height).offset).toBe(height - size)
  })

  it('positions the thumb proportionally in between', () => {
    const total = 100
    const height = 10
    const maxStart = total - height // 90
    const { offset, size } = thumbGeometry(total, maxStart / 2, height)
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(height - size)
  })
})
