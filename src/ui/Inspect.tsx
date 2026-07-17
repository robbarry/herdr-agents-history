import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import type { FeedGroup } from '../collapse.js'
import type { AgentSnapshot, ToolEvent } from '../types.js'
import { STATUS_ICON, agentColor, toolStyle } from '../theme.js'
import { formatTime, padDisplay } from './format.js'
import { computeInspectLayout } from './inspectLayout.js'
import { Scrollbar } from './Scrollbar.js'

interface Props {
  readonly group: FeedGroup | null
  readonly constituents: ToolEvent[]
  readonly agent: AgentSnapshot | null
  /** lines scrolled down from the top of the raw content (0 = start) */
  readonly scrollOffset: number
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

export function Inspect({ group, constituents, agent, scrollOffset, width, height, now }: Props) {
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

  const { rawLines, rawAreaHeight } = computeInspectLayout(group, constituents, width, height)
  const visibleRaw = rawLines.slice(scrollOffset, scrollOffset + rawAreaHeight)
  const moreBelow = rawLines.length - (scrollOffset + visibleRaw.length)

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
            <Text dimColor>
              {isTurn ? 'prompt 전문:' : 'input:'}
              {rawLines.length > rawAreaHeight ? (
                <Text dimColor>
                  {' '}
                  ({Math.min(scrollOffset + rawAreaHeight, rawLines.length)}/{rawLines.length} 줄)
                </Text>
              ) : null}
            </Text>
          </>
        ) : null}
      </Box>
      {event.raw && rawAreaHeight > 0 ? (
        <Box flexDirection="row" flexGrow={1} flexShrink={1} overflow="hidden">
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            {visibleRaw.map((line, i) => (
              <Text key={scrollOffset + i} dimColor={!isTurn} wrap="truncate">
                {line || ' '}
              </Text>
            ))}
          </Box>
          <Box flexShrink={0} marginLeft={1}>
            <Scrollbar total={rawLines.length} start={scrollOffset} height={visibleRaw.length} />
          </Box>
        </Box>
      ) : null}
      {event.raw && moreBelow > 0 ? (
        <Text dimColor>  ↓ {moreBelow}줄 더 <Text color="cyan">· [j/k] 스크롤 [g/G] 처음/끝</Text></Text>
      ) : null}
    </Box>
  )
}
