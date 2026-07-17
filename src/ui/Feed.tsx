import { Box, Text } from 'ink'
import type { AgentSnapshot, ToolEvent } from '../types.js'
import { agentColor, toolStyle } from '../theme.js'
import { formatDetail, formatTime } from './format.js'

interface FeedGroup {
  readonly event: ToolEvent
  readonly count: number
}

/** Collapse consecutive calls of the same tool by the same agent into one row. */
export function collapseEvents(events: ToolEvent[]): FeedGroup[] {
  return events.reduce<FeedGroup[]>((groups, event) => {
    const last = groups[groups.length - 1]
    if (last && last.event.agentKey === event.agentKey && last.event.tool === event.tool) {
      return [...groups.slice(0, -1), { event, count: last.count + 1 }]
    }
    return [...groups, { event, count: 1 }]
  }, [])
}

interface Props {
  readonly events: ToolEvent[]
  readonly agents: AgentSnapshot[]
  readonly height: number
  readonly width: number
  readonly pulse: boolean
  readonly now: Date
}

const LABEL_WIDTH = 19
const TOOL_WIDTH = 11

export function Feed({ events, agents, height, width, pulse, now }: Props) {
  const workingKeys = new Set(agents.filter((a) => a.status === 'working').map((a) => a.key))
  const cwdByKey = new Map(agents.map((a) => [a.key, a.cwd]))
  const rows = collapseEvents(events).slice(-Math.max(height, 1))
  const detailWidth = Math.max(width - (13 + LABEL_WIDTH + TOOL_WIDTH + 12), 10)

  if (rows.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} height={height} justifyContent="center" alignItems="center">
        <Text dimColor>agent들의 tool 호출을 기다리는 중…</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden" justifyContent="flex-end">
      {rows.map(({ event, count }) => {
        const style = toolStyle(event.tool)
        const working = workingKeys.has(event.agentKey)
        const label = event.agentLabel.slice(0, LABEL_WIDTH - 2)
        return (
          <Box key={event.id}>
            <Text dimColor>{formatTime(event.ts, now)}  </Text>
            <Text color={agentColor(event.agentKey)}>
              {label.padEnd(LABEL_WIDTH - 2)}
            </Text>
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
    </Box>
  )
}
