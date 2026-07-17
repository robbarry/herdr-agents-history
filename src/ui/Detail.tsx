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
        <Text dimColor>이 agent의 기록이 없습니다</Text>
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
          {agent ? ` · ${STATUS_ICON[agent.status] ?? '?'} ${agent.status}` : ' · (종료됨)'}
        </Text>
      </Text>
      <Text>
        <Text dimColor>활동(최근 1h) </Text>
        <Text color={agentColor(agentKey)}>{spark}</Text>
        <Text dimColor>{agentStats.firstTs ? `  시작 ${formatTime(agentStats.firstTs, now).trim()}` : ''}</Text>
      </Text>
      <Text dimColor wrap="truncate">도구 분포     {distribution || '—'}</Text>
      <Text dimColor wrap="truncate">파일 Top      {files || '—'}</Text>
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
      {scrollOffset > 0 ? <Text dimColor>  ↓ {scrollOffset}개 더 (최신)</Text> : null}
    </Box>
  )
}
