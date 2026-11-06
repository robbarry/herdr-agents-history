import { Box, Text } from 'ink'
import type { AgentSnapshot } from '../types.js'
import type { StatsStore } from '../stats.js'
import { sparkline } from '../stats.js'
import { STATUS_ICON, agentColor, toolStyle } from '../theme.js'
import { formatDetail, formatTime } from './format.js'

interface Props {
  readonly agent: AgentSnapshot | null
  readonly agentKey: string
  readonly stats: StatsStore
  readonly scrollOffset: number
  readonly width: number
  readonly height: number
  readonly now: Date
}

export function Detail({ agent, agentKey, stats, scrollOffset, width, height, now }: Props) {
  const agentStats = stats.forAgent(agentKey)
  if (!agentStats) {
    return (
      <Box height={height} justifyContent="center" alignItems="center">
        <Text dimColor>No history for this agent</Text>
      </Box>
    )
  }

  const cwd = agent?.cwd ?? ''
  const spark = sparkline(stats.activity(agentKey, 30, now))
  const distribution = stats
    .topTools(agentKey, 5)
    .map(([tool, count]) => `${tool} ${Math.round((count / agentStats.total) * 100)}%`)
    .join(' · ')
  const files = stats
    .topFiles(agentKey, 3)
    .map(([file, count]) => `${formatDetail(file, cwd, 34)} (${count})`)
    .join(' · ')

  const timelineHeight = Math.max(height - 5, 3)
  const events = agentStats.events
  const end = Math.max(events.length - scrollOffset, 0)
  const visible = events.slice(Math.max(end - timelineHeight, 0), end)
  const detailWidth = Math.max(width - 32, 10)

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden">
      <Text>
        <Text color={agentColor(agentKey)} bold>
          🔍 {agentStats.label}
        </Text>
        <Text dimColor>
          {' '}· {agentStats.kind} · {agentStats.total} calls
          {agent ? ` · ${STATUS_ICON[agent.status] ?? '?'} ${agent.status}` : ' · (exited)'}
        </Text>
      </Text>
      <Text>
        <Text dimColor>Activity (last 1h) </Text>
        <Text color={agentColor(agentKey)}>{spark}</Text>
        <Text dimColor>{agentStats.firstTs ? `  started ${formatTime(agentStats.firstTs, now).trim()}` : ''}</Text>
      </Text>
      <Text dimColor wrap="truncate">Tool usage    {distribution || '—'}</Text>
      <Text dimColor wrap="truncate">Top files     {files || '—'}</Text>
      <Text dimColor>{'─'.repeat(Math.max(width - 2, 1))}</Text>
      {visible.map((event) => {
        const style = toolStyle(event.tool)
        return (
          <Box key={event.id}>
            <Text dimColor>{formatTime(event.ts, now)}  </Text>
            <Text>{style.icon} </Text>
            <Text color={style.color} bold>
              {event.tool.slice(0, 11).padEnd(11)}
            </Text>
            <Box flexGrow={1} flexShrink={1}>
              <Text dimColor wrap="truncate">
                {' '}
                {formatDetail(event.detail, cwd, detailWidth)}
              </Text>
            </Box>
          </Box>
        )
      })}
      {scrollOffset > 0 ? <Text dimColor>  ↓ {scrollOffset} newer entries below</Text> : null}
    </Box>
  )
}
