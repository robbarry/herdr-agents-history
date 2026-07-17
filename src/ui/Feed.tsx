import { Box, Text } from 'ink'
import type { FeedGroup } from '../collapse.js'
import type { AgentSnapshot } from '../types.js'
import { agentColor, toolStyle } from '../theme.js'
import { formatDetail, formatTime } from './format.js'
import { Scrollbar } from './Scrollbar.js'

interface Props {
  readonly groups: FeedGroup[]
  readonly bottomIndex: number
  readonly focusIndex: number | null
  readonly agents: AgentSnapshot[]
  readonly height: number
  readonly width: number
  readonly pulse: boolean
  readonly now: Date
}

const LABEL_WIDTH = 19
const TOOL_WIDTH = 11

export function Feed({ groups, bottomIndex, focusIndex, agents, height, width, pulse, now }: Props) {
  const workingKeys = new Set(agents.filter((a) => a.status === 'working').map((a) => a.key))
  const cwdByKey = new Map(agents.map((a) => [a.key, a.cwd]))
  const detailWidth = Math.max(width - (13 + LABEL_WIDTH + TOOL_WIDTH + 14 + 2), 10)

  if (groups.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} height={height} justifyContent="center" alignItems="center">
        <Text dimColor>agent들의 tool 호출을 기다리는 중…</Text>
      </Box>
    )
  }

  const focused = focusIndex !== null
  const listHeight = focused ? Math.max(height - 1, 1) : height
  const start = Math.max(bottomIndex - listHeight + 1, 0)
  const rows = groups.slice(start, bottomIndex + 1)
  const newerCount = groups.length - 1 - bottomIndex

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden" justifyContent="flex-end">
      <Box flexDirection="row">
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {rows.map(({ event, count }, rowIndex) => {
            const isFocused = focusIndex !== null && start + rowIndex === focusIndex
            const gutter = isFocused ? <Text color="cyan">▸ </Text> : <Text>{'  '}</Text>
            if (event.kind === 'turn') {
              return (
                <Text key={event.id} wrap="truncate">
                  {gutter}
                  <Text dimColor>{formatTime(event.ts, now)}  </Text>
                  <Text color={agentColor(event.agentKey)} bold={isFocused}>
                    ❯ {event.agentLabel.slice(0, LABEL_WIDTH - 2)}
                  </Text>
                  <Text dimColor>
                    {' '}
                    “{event.detail}” {'─'.repeat(width)}
                  </Text>
                </Text>
              )
            }
            const style = toolStyle(event.tool)
            const working = workingKeys.has(event.agentKey)
            const label = event.agentLabel.slice(0, LABEL_WIDTH - 2)
            return (
              <Box key={event.id}>
                <Box flexShrink={0}>
                  {gutter}
                  <Text dimColor={!isFocused} bold={isFocused}>
                    {formatTime(event.ts, now)}
                    {'  '}
                  </Text>
                  <Text color={agentColor(event.agentKey)}>{label.padEnd(LABEL_WIDTH - 2)}</Text>
                  <Text color="yellowBright">{working && pulse ? '● ' : '  '}</Text>
                  <Text>{style.icon} </Text>
                  <Text color={style.color} bold>
                    {event.tool.slice(0, TOOL_WIDTH).padEnd(TOOL_WIDTH)}
                  </Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  <Text dimColor wrap="truncate">
                    {' '}
                    {formatDetail(event.detail, cwdByKey.get(event.agentKey) ?? '', detailWidth)}
                  </Text>
                </Box>
                {count > 1 ? (
                  <Box flexShrink={0}>
                    <Text color="yellow"> ×{count}</Text>
                  </Box>
                ) : null}
              </Box>
            )
          })}
        </Box>
        <Box flexShrink={0} marginLeft={1}>
          <Scrollbar total={groups.length} start={start} height={rows.length} />
        </Box>
      </Box>
      {focused ? (
        <Text color="cyan">
          {'  '}↓ {newerCount}개 더 아래 <Text dimColor>· [Enter] 자세히 [j/k] 이동 [G] 최신 따라가기</Text>
        </Text>
      ) : null}
    </Box>
  )
}
