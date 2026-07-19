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
  /** the call's result, if it has arrived yet (looked up by toolUseId) */
  readonly output?: string
  /** rows scrolled down from the very top of the view (0 = start) — the whole
   *  view (title through input/output) scrolls together as one region */
  readonly scrollOffset: number
  readonly width: number
  readonly height: number
  readonly now: Date
}

function metaRow(label: string, children: ReactNode): ReactNode {
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

export function Inspect({ group, constituents, agent, output, scrollOffset, width, height, now }: Props) {
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
  // -4 for paddingX(2)*2, -2 for the scrollbar gutter shared with every other
  // row now that dividers live inside the same scrollable column — without
  // matching that budget exactly, Ink's default word-wrap breaks this onto a
  // second physical line, desyncing the row-index accounting for everything
  // that scrolls below it. wrap="truncate" is a safety net, not the fix.
  const dividerText = '─'.repeat(Math.max(width - 4 - 2, 1))
  const divider = (
    <Text dimColor wrap="truncate">
      {dividerText}
    </Text>
  )
  const timeLabel =
    count > 1 && constituents.length > 0
      ? `${formatTime(constituents[0].ts, now).trim()} ~ ${formatTime(event.ts, now).trim()} (×${count})`
      : formatTime(event.ts, now).trim()

  const { detailLines, constituentPreviews, constituentOverflow, bodyLines, totalLines, visibleHeight } =
    computeInspectLayout(group, constituents, width, height, now, output)

  // one row per line of the whole view, in the same order computeInspectLayout
  // counted them — keeping totalLines and this array in lockstep is what lets
  // the whole thing (not just input/output) scroll as one region
  const rows: ReactNode[] = []
  rows.push(
    <Text bold wrap="truncate" key="title">
      {isTurn ? '❯ 대화 턴' : `${style.icon} ${event.tool}`}
      <Text dimColor> · 자세히 보기</Text>
    </Text>
  )
  rows.push(<Box key="divider-top">{divider}</Box>)
  rows.push(
    <Box key="agent">
      {metaRow(
        'agent',
        <Text wrap="truncate">
          <Text color={agentColor(event.agentKey)}>{event.agentLabel}</Text>
          <Text dimColor>
            {' '}
            ({event.agentKind}){agent ? ` · ${STATUS_ICON[agent.status] ?? '?'} ${agent.status}` : ''}
          </Text>
        </Text>
      )}
    </Box>
  )
  rows.push(
    <Box key="time">
      {metaRow('time', <Text wrap="truncate">{timeLabel}</Text>)}
    </Box>
  )
  detailLines.forEach((line, i) => {
    rows.push(
      <Box key={`detail-${i}`}>
        <Box flexShrink={0}>
          <Text dimColor>{padDisplay(i === 0 ? 'detail' : '', 10)}</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate">{line}</Text>
        </Box>
      </Box>
    )
  })
  if (count > 1) {
    rows.push(<Box key="divider-constituents">{divider}</Box>)
    rows.push(
      <Text dimColor wrap="truncate" key="constituents-label">
        연속 호출 {count}회:
      </Text>
    )
    constituentPreviews.forEach((preview) => {
      preview.lines.forEach((line, i) => {
        rows.push(
          <Text key={`constituent-${preview.id}-${i}`} wrap="truncate">
            <Text dimColor>{i === 0 ? `${preview.time}  ` : ' '.repeat(13)}</Text>
            <Text>{line}</Text>
          </Text>
        )
      })
    })
    if (constituentOverflow > 0) {
      rows.push(
        <Text dimColor wrap="truncate" key="constituents-overflow">
          {'  '}… 외 {constituentOverflow}회
        </Text>
      )
    }
  }
  if (bodyLines.length > 0) {
    rows.push(<Box key="divider-body">{divider}</Box>)
    bodyLines.forEach((line, i) => {
      rows.push(
        <Text key={`body-${i}`} dimColor={!line.isLabel} bold={line.isLabel} wrap="truncate">
          {line.text || ' '}
        </Text>
      )
    })
  }

  const visibleRows = rows.slice(scrollOffset, scrollOffset + visibleHeight)
  const moreBelow = totalLines - (scrollOffset + visibleRows.length)

  return (
    <Box flexDirection="column" paddingX={2} height={height} overflow="hidden">
      <Box flexDirection="row" flexGrow={1} flexShrink={1} overflow="hidden">
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {visibleRows}
        </Box>
        <Box flexShrink={0} marginLeft={1}>
          <Scrollbar total={totalLines} start={scrollOffset} height={visibleRows.length} />
        </Box>
      </Box>
      {moreBelow > 0 ? (
        <Text dimColor>
          {' '}
          ↓ {moreBelow}줄 더 <Text color="cyan">· [j/k] 스크롤 [g/G] 처음/끝</Text>
        </Text>
      ) : null}
    </Box>
  )
}
