import { Box, Text } from 'ink'
import type { AgentSnapshot } from '../types.js'
import type { StatsStore } from '../stats.js'
import { sparkline } from '../stats.js'
import { STATUS_ICON, agentColor, toolStyle } from '../theme.js'
import { formatDetail } from './format.js'

const STATUS_COLOR: Readonly<Record<string, string>> = {
  working: 'yellow',
  blocked: 'red',
  done: 'green',
  idle: 'gray'
}

interface Props {
  readonly agents: AgentSnapshot[]
  readonly stats: StatsStore
  readonly selected: number
  readonly width: number
  readonly height: number
  readonly now: Date
}

export function cardsPerRow(width: number): number {
  return Math.max(Math.floor(width / 44), 1)
}

export function Board({ agents, stats, selected, width, height, now }: Props) {
  if (agents.length === 0) {
    return (
      <Box height={height} justifyContent="center" alignItems="center">
        <Text dimColor>추적 중인 agent가 없습니다</Text>
      </Box>
    )
  }

  const perRow = cardsPerRow(width)
  const cardWidth = Math.floor((width - 2) / perRow)
  const innerWidth = cardWidth - 4

  // keep the selected card on screen: show only the card-rows around it
  const CARD_HEIGHT = 7
  const visibleCardRows = Math.max(Math.floor(height / CARD_HEIGHT), 1)
  const selectedRow = Math.floor(selected / perRow)
  const firstRow = Math.max(Math.min(selectedRow - visibleCardRows + 1, Math.ceil(agents.length / perRow) - visibleCardRows), 0)
  const visibleAgents = agents
    .map((agent, index) => ({ agent, index }))
    .slice(firstRow * perRow, (firstRow + visibleCardRows) * perRow)

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden">
      <Box flexWrap="wrap">
        {visibleAgents.map(({ agent, index }) => {
          const agentStats = stats.forAgent(agent.key)
          const spark = sparkline(stats.activity(agent.key, Math.min(20, innerWidth - 14), now))
          const top = stats.topTools(agent.key, 2)
          const maxCount = top[0]?.[1] ?? 1
          const isSelected = index === selected
          const last = agentStats?.lastEvent ?? null
          const lastStyle = last ? toolStyle(last.tool) : null
          return (
            <Box
              key={agent.key}
              flexDirection="column"
              borderStyle="round"
              borderColor={isSelected ? 'cyan' : 'gray'}
              width={cardWidth}
              paddingX={1}
            >
              <Box justifyContent="space-between">
                <Text>
                  <Text color={STATUS_COLOR[agent.status] ?? 'white'}>
                    {STATUS_ICON[agent.status] ?? '?'}{' '}
                  </Text>
                  <Text color={agentColor(agent.key)} bold={isSelected}>
                    {agent.label.slice(0, innerWidth - 12)}
                  </Text>
                </Text>
                <Text dimColor>{agent.kind}</Text>
              </Box>
              <Text>
                <Text color={agentColor(agent.key)}>{spark}</Text>
                <Text dimColor>  {agentStats?.total ?? 0} calls</Text>
              </Text>
              {top.map(([tool, count]) => {
                const barWidth = Math.max(Math.round((count / maxCount) * (innerWidth - 16)), 1)
                return (
                  <Text key={tool}>
                    <Text color={toolStyle(tool).color}>{tool.slice(0, 9).padEnd(10)}</Text>
                    <Text color={toolStyle(tool).color}>{'█'.repeat(barWidth)}</Text>
                    <Text dimColor> {count}</Text>
                  </Text>
                )
              })}
              <Text dimColor wrap="truncate">
                {last && lastStyle
                  ? `▸ ${lastStyle.icon} ${formatDetail(last.detail, agent.cwd, innerWidth - 5)}`
                  : '▸ 아직 tool 호출 없음'}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
