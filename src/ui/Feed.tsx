import { Box, Text } from 'ink'
import type { FeedGroup } from '../collapse.js'
import type { AgentSnapshot } from '../types.js'
import { agentColor, toolStyle } from '../theme.js'
import { displayWidth, formatDetail, padDisplay, truncateDisplay } from './format.js'
import { Scrollbar } from './Scrollbar.js'

// focused row: solid highlight with a high-contrast complementary text color
const FOCUS_BG = 'cyanBright'
const FOCUS_FG = 'black'

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

const AGENT_WIDTH = 5
const TOOL_WIDTH = 11
// fixed row budget: agent(+space) + working-dot + icon(2 cols, emoji)+space + tool name(+space) + scrollbar gutter + count suffix margin
const FIXED_WIDTH = AGENT_WIDTH + 1 + 2 + 3 + TOOL_WIDTH + 1 + 2 + 6

export function Feed({ groups, bottomIndex, focusIndex, agents, height, width, pulse, now }: Props) {
  const workingKeys = new Set(agents.filter((a) => a.status === 'working').map((a) => a.key))
  const cwdByKey = new Map(agents.map((a) => [a.key, a.cwd]))
  const detailWidth = Math.max(width - FIXED_WIDTH, 10)

  if (groups.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} height={height} justifyContent="center" alignItems="center">
        <Text dimColor>Waiting for agent tool calls…</Text>
      </Box>
    )
  }

  const focused = focusIndex !== null
  const newerCount = groups.length - 1 - bottomIndex
  // the "N more below" hint only appears when there is actually more below; at
  // the newest row (newerCount === 0) it vanishes and the list reclaims its row
  const showIndicator = focused && newerCount > 0
  const listHeight = showIndicator ? Math.max(height - 1, 1) : height
  const start = Math.max(bottomIndex - listHeight + 1, 0)
  const rows = groups.slice(start, bottomIndex + 1)
  const contentWidth = Math.max(width - 4, 10)

  return (
    <Box flexDirection="column" paddingX={1} height={height} overflow="hidden" justifyContent="flex-end">
      <Box flexDirection="row">
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {rows.map(({ event, count }, rowIndex) => {
            const isFocused = focusIndex !== null && start + rowIndex === focusIndex
            const label = event.agentLabel.slice(0, AGENT_WIDTH)
            const working = workingKeys.has(event.agentKey)

            // focused row: assemble one string (emoji counted as 2 cols),
            // truncate it ourselves, then pad so the highlight fills the line.
            // Handing Ink's own wrap="truncate" a very long (200+ char) string
            // has been observed to make it miscompute the row's height,
            // bleeding the next row's content onto the same terminal line —
            // pre-truncating keeps what Ink receives short and safe.
            if (isFocused) {
              const line =
                event.kind === 'turn'
                  ? truncateDisplay(`❯ ${label}  “${event.detail}”`, contentWidth)
                  : `${padDisplay(label, AGENT_WIDTH)} ` +
                    `${working && pulse ? '● ' : '  '}${toolStyle(event.tool).icon} ` +
                    `${event.tool.slice(0, TOOL_WIDTH).padEnd(TOOL_WIDTH)} ` +
                    `${formatDetail(event.detail, cwdByKey.get(event.agentKey) ?? '', detailWidth)}` +
                    `${count > 1 ? ` ×${count}` : ''}`
              return (
                <Box key={event.id}>
                  <Text backgroundColor={FOCUS_BG} color={FOCUS_FG} bold wrap="truncate">
                    {padDisplay(line, contentWidth)}
                  </Text>
                </Box>
              )
            }

            if (event.kind === 'turn') {
              const prefix = `❯ ${label}`
              const tailWidth = Math.max(contentWidth - displayWidth(prefix) - 1, 10)
              const tail = truncateDisplay(`“${event.detail}” ${'─'.repeat(20)}`, tailWidth)
              return (
                <Text key={event.id} wrap="truncate">
                  <Text color={agentColor(event.agentKey)}>{prefix}</Text>
                  <Text dimColor> {tail}</Text>
                </Text>
              )
            }
            const style = toolStyle(event.tool)
            return (
              <Box key={event.id}>
                <Box flexShrink={0}>
                  <Text color={agentColor(event.agentKey)}>{label.padEnd(AGENT_WIDTH)} </Text>
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
      {showIndicator ? (
        <Text color="cyan">
          {'  '}↓ {newerCount} more below <Text dimColor>· [Enter] inspect [j/k] move [G] follow latest</Text>
        </Text>
      ) : null}
    </Box>
  )
}
