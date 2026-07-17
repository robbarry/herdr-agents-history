import { Box, Text } from 'ink'
import type { FeedGroup } from '../collapse.js'
import type { AgentSnapshot } from '../types.js'
import { agentColor, toolStyle } from '../theme.js'
import { formatDetail, formatTime } from './format.js'

interface Props {
  readonly groups: FeedGroup[]
  readonly bottomIndex: number
  readonly anchored: boolean
  readonly agents: AgentSnapshot[]
  readonly height: number
  readonly width: number
  readonly pulse: boolean
  readonly now: Date
}

const LABEL_WIDTH = 19
const TOOL_WIDTH = 11

export function Feed({ groups, bottomIndex, anchored, agents, height, width, pulse, now }: Props) {
  const workingKeys = new Set(agents.filter((a) => a.status === 'working').map((a) => a.key))
  const cwdByKey = new Map(agents.map((a) => [a.key, a.cwd]))
  const detailWidth = Math.max(width - (13 + LABEL_WIDTH + TOOL_WIDTH + 12), 10)

  if (groups.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} height={height} justifyContent="center" alignItems="center">
        <Text dimColor>agent들의 tool 호출을 기다리는 중…</Text>
      </Box>
    )
  }

  const listHeight = anchored ? Math.max(height - 1, 1) : height
  const rows = groups.slice(Math.max(bottomIndex - listHeight + 1, 0), bottomIndex + 1)
  const newerCount = groups.length - 1 - bottomIndex

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden" justifyContent="flex-end">
      {rows.map(({ event, count }) => {
        if (event.kind === 'turn') {
          return (
            <Text key={event.id} wrap="truncate">
              <Text dimColor>{formatTime(event.ts, now)}  </Text>
              <Text color={agentColor(event.agentKey)}>❯ {event.agentLabel.slice(0, LABEL_WIDTH - 2)}</Text>
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
            <Text dimColor>{formatTime(event.ts, now)}  </Text>
            <Text color={agentColor(event.agentKey)}>{label.padEnd(LABEL_WIDTH - 2)}</Text>
            <Text color="yellowBright">{working && pulse ? '● ' : '  '}</Text>
            <Text>{style.icon} </Text>
            <Text color={style.color} bold>
              {event.tool.slice(0, TOOL_WIDTH).padEnd(TOOL_WIDTH)}
            </Text>
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
      {anchored ? (
        <Text color="cyan">
          {'  '}↓ {newerCount}개 더 아래 <Text dimColor>· [j] 아래로 [G] 최신 따라가기</Text>
        </Text>
      ) : null}
    </Box>
  )
}
