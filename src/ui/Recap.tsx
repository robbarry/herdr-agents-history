import { Box, Text } from 'ink'
import type { StatsStore } from '../stats.js'
import { computeRecap } from '../recap.js'
import { displayWidth, padDisplay } from './format.js'

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
        <Text dimColor>No tool calls yet today</Text>
      </Box>
    )
  }

  const titleWidth = Math.max(...recap.badges.map((badge) => displayWidth(badge.title)), 0) + 2
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} height={height} overflow="hidden">
      <Text bold>
        🌙 Today's recap <Text dimColor>· {date}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(Math.max(Math.min(width - 6, 46), 1))}</Text>
      <Text>
        Total <Text bold color="yellowBright">{recap.totalCalls.toLocaleString('en-US')}</Text> tool calls
        <Text dimColor>
          {' '}· {recap.activeAgents} agents · activity span {recap.spanLabel}
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
