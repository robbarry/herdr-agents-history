import { Box, Text } from 'ink'

const HINTS: Readonly<Record<string, string>> = {
  feed: '[Tab] board  [r] recap  [j/k] scroll  [G] 최신  [/] filter  [p] pause  [q] quit',
  board: '[Tab] feed  [←→↑↓/hjkl] 이동  [Enter] 상세  [r] recap  [q] quit',
  detail: '[j/k] scroll  [g/G] 처음/끝  [Esc] board  [q] quit',
  recap: '[Esc/r] 돌아가기  [q] quit'
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
