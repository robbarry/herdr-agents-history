import { Box, Text } from 'ink'

const HINTS: Readonly<Record<string, string>> = {
  feed: '[Tab] board  [r] recap  [↑↓] select  [Enter] inspect  [/] filter  [p] pause  [q] quit',
  board: '[Tab] feed  [←→↑↓/hjkl] move  [Enter] detail  [r] recap  [q] quit',
  detail: '[j/k] scroll  [g/G] top/bottom  [Esc] board  [q] quit',
  recap: '[Esc/r] back  [q] quit',
  inspect: '[j/k] scroll  [g/G] top/bottom  [Esc/Enter] back  [q] quit'
}

interface Props {
  readonly view: string
  readonly filter: string
  readonly filterMode: boolean
}

export function Footer({ view, filter, filterMode }: Props) {
  return (
    <Box paddingX={1}>
      {filterMode ? (
        <Text>
          <Text color="cyan">/</Text>
          <Text>{filter}</Text>
          <Text inverse> </Text>
          <Text dimColor>  [Enter] apply  [Esc] clear</Text>
        </Text>
      ) : (
        <Text dimColor>
          {view === 'feed' && filter.length > 0 ? `filter: ${filter}  ·  ` : ''}
          {HINTS[view] ?? ''}
        </Text>
      )}
    </Box>
  )
}
