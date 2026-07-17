import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import type { FeedGroup } from '../collapse.js'
import type { AgentSnapshot, ToolEvent } from '../types.js'
import { STATUS_ICON, agentColor, toolStyle } from '../theme.js'
import { formatTime, padDisplay } from './format.js'

interface Props {
  readonly group: FeedGroup | null
  readonly constituents: ToolEvent[]
  readonly agent: AgentSnapshot | null
  readonly width: number
  readonly height: number
  readonly now: Date
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text dimColor>{padDisplay(label, 10)}</Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>
        {children}
      </Box>
    </Box>
  )
}

export function Inspect({ group, constituents, agent, width, height, now }: Props) {
  if (!group) {
    return (
      <Box height={height} justifyContent="center" alignItems="center">
        <Text dimColor>이 호출은 버퍼에서 제거되었습니다 — [Esc] 돌아가기</Text>
      </Box>
    )
  }

  const { event, count } = group
  const isTurn = event.kind === 'turn'
  const style = toolStyle(event.tool)
  const divider = <Text dimColor>{'─'.repeat(Math.max(width - 4, 1))}</Text>
  const timeLabel =
    count > 1 && constituents.length > 0
      ? `${formatTime(constituents[0].ts, now).trim()} ~ ${formatTime(event.ts, now).trim()} (×${count})`
      : formatTime(event.ts, now).trim()

  return (
    <Box flexDirection="column" paddingX={2} height={height} overflow="hidden">
      <Box flexDirection="column" flexShrink={0}>
        <Text bold>
          {isTurn ? '❯ 대화 턴' : `${style.icon} ${event.tool}`}
          <Text dimColor> · 자세히 보기</Text>
        </Text>
        {divider}
        <Row label="agent">
          <Text>
            <Text color={agentColor(event.agentKey)}>{event.agentLabel}</Text>
            <Text dimColor>
              {' '}
              ({event.agentKind}){agent ? ` · ${STATUS_ICON[agent.status] ?? '?'} ${agent.status}` : ''}
            </Text>
          </Text>
        </Row>
        <Row label="time">
          <Text>{timeLabel}</Text>
        </Row>
        {!isTurn && event.detail.length > 0 ? (
          <Row label="detail">
            <Text wrap="truncate-end">{event.detail}</Text>
          </Row>
        ) : null}
        {count > 1 ? (
          <>
            {divider}
            <Text dimColor>연속 호출 {count}회:</Text>
            {constituents.slice(-8).map((item) => (
              <Text key={item.id} wrap="truncate">
                <Text dimColor>{formatTime(item.ts, now)}  </Text>
                <Text>{item.detail || '(no detail)'}</Text>
              </Text>
            ))}
            {constituents.length > 8 ? <Text dimColor>  … 외 {constituents.length - 8}회</Text> : null}
          </>
        ) : null}
        {event.raw ? (
          <>
            {divider}
            <Text dimColor>{isTurn ? 'prompt 전문:' : 'input:'}</Text>
          </>
        ) : null}
      </Box>
      {event.raw ? (
        <Box overflow="hidden" flexGrow={1} flexShrink={1}>
          <Text wrap="wrap" dimColor={!isTurn}>
            {event.raw}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
