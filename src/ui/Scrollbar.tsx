import { Box, Text } from 'ink'

interface Props {
  /** total number of scrollable rows (the full group list) */
  readonly total: number
  /** index of the first visible row */
  readonly start: number
  /** track height — always equals the number of rows actually rendered */
  readonly height: number
}

/** Thumb size and position, in track rows — the pure math behind the scrollbar. */
export function thumbGeometry(total: number, start: number, height: number): { size: number; offset: number } {
  const size = Math.min(height, Math.max(1, Math.round((height / total) * height)))
  const scrollableTrack = height - size
  const scrollableRange = total - height
  const offset = scrollableRange > 0 ? Math.round((start / scrollableRange) * scrollableTrack) : 0
  return { size, offset }
}

/**
 * A vertical scrollbar: a filled thumb sized to the visible fraction of the
 * list, positioned by how far `start` has scrolled through the scrollable
 * range. Renders nothing (just blank gutter) when everything already fits.
 */
export function Scrollbar({ total, start, height }: Props) {
  if (height <= 0) return null
  if (total <= height) {
    return (
      <Box flexDirection="column" flexShrink={0}>
        {Array.from({ length: height }, (_, i) => (
          <Text key={i}> </Text>
        ))}
      </Box>
    )
  }

  const { size: thumbSize, offset: thumbStart } = thumbGeometry(total, start, height)

  return (
    <Box flexDirection="column" flexShrink={0}>
      {Array.from({ length: height }, (_, i) => {
        const filled = i >= thumbStart && i < thumbStart + thumbSize
        return (
          <Text key={i} color="cyan" dimColor={!filled}>
            {filled ? '█' : '│'}
          </Text>
        )
      })}
    </Box>
  )
}
