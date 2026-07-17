import { Box, Text } from 'ink'
import type { StatsStore } from '../stats.js'
import { computeRecap } from '../recap.js'
import { padDisplay } from './format.js'

interface Props {
  readonly stats: StatsStore
  readonly width: number
  readonly height: number
  readonly now: Date
}

export function Recap({ stats, width, height, now }: Props) {
  const recap = computeRecap(stats, now)
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (recap.totalCalls === 0) {
    return (
      <Box height={height} justifyContent="center" alignItems="center">
        <Text dimColor>오늘은 아직 조용하네요 — tool 호출이 없습니다</Text>
      </Box>
    )
  }

  const titleWidth = Math.max(...recap.badges.map((badge) => [...badge.title].length * 2), 0) + 2
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} height={height} overflow="hidden">
      <Text bold>
        🌙 오늘의 리캡 <Text dimColor>· {date}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(Math.max(Math.min(width - 6, 46), 1))}</Text>
      <Text>
        총 <Text bold color="yellowBright">{recap.totalCalls.toLocaleString()}</Text> tool calls
        <Text dimColor>
          {' '}· agent {recap.activeAgents}명 · 활동 범위 {recap.spanLabel}
        </Text>
      </Text>
      <Box height={1} />
      {recap.badges.map((badge) => (
        <Box key={badge.title}>
          <Box flexShrink={0}>
            <Text>
              {badge.icon} <Text bold>{padDisplay(badge.title, titleWidth)}</Text>
            </Text>
          </Box>
          <Box flexGrow={1} flexShrink={1}>
            <Text wrap="truncate">{badge.description}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
