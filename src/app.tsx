import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { useEffect, useMemo, useRef, useState } from 'react'
import { insertEvents } from './buffer.js'
import { clampWindow, collapseEvents, focusIndexFor } from './collapse.js'
import { Collector } from './collector/collector.js'
import { getConfig } from './config.js'
import { BadgeReporter } from './reporter.js'
import { StatsStore } from './stats.js'
import { Board, cardsPerRow } from './ui/Board.js'
import { Detail } from './ui/Detail.js'
import { Feed } from './ui/Feed.js'
import { Footer } from './ui/Footer.js'
import { Header } from './ui/Header.js'
import { Inspect } from './ui/Inspect.js'
import { computeInspectLayout } from './ui/inspectLayout.js'
import { Recap } from './ui/Recap.js'
import type { AgentSnapshot, ToolEvent } from './types.js'

type View =
  | { kind: 'feed' }
  | { kind: 'board' }
  | { kind: 'detail'; agentKey: string }
  | { kind: 'recap' }
  | { kind: 'inspect'; firstId: number }

function matchesFilter(event: ToolEvent, filter: string): boolean {
  if (filter.length === 0) return true
  const haystack = `${event.agentLabel} ${event.agentKind} ${event.tool} ${event.detail}`.toLowerCase()
  return filter
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term))
}

export function App() {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [events, setEvents] = useState<ToolEvent[]>([])
  const [agents, setAgents] = useState<AgentSnapshot[]>([])
  const [now, setNow] = useState(() => new Date())
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [filterMode, setFilterMode] = useState(false)
  const [view, setView] = useState<View>({ kind: 'feed' })
  const [selected, setSelected] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [inspectScroll, setInspectScroll] = useState(0)
  const [feedFocus, setFeedFocus] = useState<number | null>(null)
  /** firstId of the window's bottom-most visible group; null = follow live (bottom = newest) */
  const [feedWindowAnchor, setFeedWindowAnchor] = useState<number | null>(null)
  const frozen = useRef<ToolEvent[] | null>(null)
  const stats = useRef(new StatsStore())
  // held in a ref (not state) so Inspect can query getOutput() during render;
  // outputs arrive out-of-band from the tool-call events and don't need their
  // own re-render trigger — the once-a-second clock tick already covers it
  const collectorRef = useRef<Collector | null>(null)

  useEffect(() => {
    const collector = new Collector()
    collectorRef.current = collector
    const reporter = getConfig().badge ? new BadgeReporter(stats.current) : null
    const onEvents = (batch: ToolEvent[]) => {
      for (const event of batch) if (event.kind === 'tool') stats.current.add(event)
      setEvents((prev) => insertEvents(prev, batch))
    }
    const onAgents = (list: AgentSnapshot[]) => {
      setAgents(list)
      reporter?.update(list)
    }
    collector.on('events', onEvents)
    collector.on('agents', onAgents)
    collector.start()
    reporter?.start()
    const clock = setInterval(() => setNow(new Date()), 1_000)
    return () => {
      clearInterval(clock)
      collector.stop()
      reporter?.stop()
      collectorRef.current = null
    }
  }, [])

  const columns = stdout?.columns ?? 100
  const rows = stdout?.rows ?? 30
  const bodyHeight = Math.max(rows - 3, 3)

  const visible = useMemo(() => {
    const source = paused && frozen.current ? frozen.current : events
    return source.filter((event) => matchesFilter(event, filter))
  }, [events, filter, paused])
  const feedGroups = useMemo(() => collapseEvents(visible), [visible])
  const feedLast = feedGroups.length - 1
  const focusIndex = focusIndexFor(feedGroups, feedFocus)
  const feedListHeight = focusIndex === null ? bodyHeight : Math.max(bodyHeight - 1, 1)
  const feedBottom = focusIndex === null ? feedLast : (focusIndexFor(feedGroups, feedWindowAnchor) ?? feedLast)

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key)),
    [agents]
  )

  const inspectGroup = view.kind === 'inspect' ? (feedGroups.find((g) => g.firstId === view.firstId) ?? null) : null
  const inspectConstituents = useMemo(() => {
    if (!inspectGroup) return []
    const g = inspectGroup
    return visible.filter(
      (e) => e.id >= g.firstId && e.id <= g.event.id && e.agentKey === g.event.agentKey && e.tool === g.event.tool && e.kind === g.event.kind
    )
  }, [inspectGroup, visible])
  const inspectOutput = collectorRef.current?.getOutput(inspectGroup?.event.toolUseId)
  const inspectLayout = inspectGroup
    ? computeInspectLayout(inspectGroup, inspectConstituents, columns, bodyHeight, now, inspectOutput)
    : null
  const inspectMaxScroll = inspectLayout ? Math.max(inspectLayout.totalLines - inspectLayout.visibleHeight, 0) : 0

  useInput((input, key) => {
    if (filterMode) {
      if (key.return) setFilterMode(false)
      else if (key.escape) {
        setFilter('')
        setFilterMode(false)
      } else if (key.backspace || key.delete) setFilter((prev) => prev.slice(0, -1))
      else if (input && !key.ctrl && !key.meta) setFilter((prev) => prev + input)
      return
    }
    if (input === 'q') {
      exit()
      return
    }

    if (view.kind === 'recap') {
      if (key.escape || key.tab || input === 'r') setView({ kind: 'feed' })
      return
    }

    if (view.kind === 'feed') {
      const last = feedLast
      const goLive = () => {
        setFeedFocus(null)
        setFeedWindowAnchor(null)
      }
      // moves focus to rawIndex, scrolling the window only the minimum
      // amount needed to keep it visible (see clampWindow) — a fixed window
      // that only shifts once focus reaches its near edge
      const moveFocus = (rawIndex: number) => {
        if (last < 0 || rawIndex > last) {
          goLive()
          return
        }
        const newIndex = Math.max(rawIndex, 0)
        const newWindowBottom = clampWindow(newIndex, feedBottom, feedListHeight, last)
        setFeedFocus(feedGroups[newIndex].firstId)
        setFeedWindowAnchor(newWindowBottom >= last ? null : feedGroups[newWindowBottom].firstId)
      }
      if (key.tab) setView({ kind: 'board' })
      else if (input === 'r') setView({ kind: 'recap' })
      // first press from live lands exactly on the newest row (last), not last-1
      else if (input === 'k' || key.upArrow) moveFocus(focusIndex === null ? last : focusIndex - 1)
      else if (input === 'j' || key.downArrow) moveFocus(focusIndex === null ? last : focusIndex + 1)
      else if (key.pageUp) moveFocus((focusIndex ?? last) - (feedListHeight - 1))
      else if (key.pageDown) moveFocus((focusIndex ?? last) + (feedListHeight - 1))
      else if (input === 'g') moveFocus(0)
      else if (input === 'G') goLive()
      else if (key.return && feedGroups.length > 0) {
        setInspectScroll(0)
        setView({ kind: 'inspect', firstId: feedGroups[focusIndex ?? last].firstId })
      } else if (input.startsWith('/')) {
        // pasted chunks arrive as one input string: "/webfetch" seeds the filter
        setFilterMode(true)
        setFilter(input.slice(1))
        goLive()
      } else if (key.escape) {
        if (focusIndex !== null) goLive()
        else setFilter('')
      } else if (input === 'p') {
        setPaused((prev) => {
          frozen.current = prev ? null : events
          return !prev
        })
      }
      return
    }

    if (view.kind === 'inspect') {
      const pageSize = Math.max((inspectLayout?.visibleHeight ?? 1) - 1, 1)
      if (key.escape || key.return || key.tab) setView({ kind: 'feed' })
      else if (input === 'j' || key.downArrow) setInspectScroll((prev) => Math.min(prev + 1, inspectMaxScroll))
      else if (input === 'k' || key.upArrow) setInspectScroll((prev) => Math.max(prev - 1, 0))
      else if (key.pageDown) setInspectScroll((prev) => Math.min(prev + pageSize, inspectMaxScroll))
      else if (key.pageUp) setInspectScroll((prev) => Math.max(prev - pageSize, 0))
      else if (input === 'g') setInspectScroll(0)
      else if (input === 'G') setInspectScroll(inspectMaxScroll)
      return
    }

    if (view.kind === 'board') {
      const perRow = cardsPerRow(columns)
      const clamp = (index: number) => Math.min(Math.max(index, 0), Math.max(sortedAgents.length - 1, 0))
      if (key.tab || key.escape) setView({ kind: 'feed' })
      else if (input === 'r') setView({ kind: 'recap' })
      else if (key.return && sortedAgents[selected]) {
        setScrollOffset(0)
        setView({ kind: 'detail', agentKey: sortedAgents[selected].key })
      } else if (key.leftArrow || input === 'h') setSelected((prev) => clamp(prev - 1))
      else if (key.rightArrow || input === 'l') setSelected((prev) => clamp(prev + 1))
      else if (key.upArrow || input === 'k') setSelected((prev) => clamp(prev - perRow))
      else if (key.downArrow || input === 'j') setSelected((prev) => clamp(prev + perRow))
      return
    }

    // detail
    const total = stats.current.forAgent(view.agentKey)?.events.length ?? 0
    const maxOffset = Math.max(total - 1, 0)
    if (key.escape || key.tab) setView({ kind: 'board' })
    else if (input === 'k' || key.upArrow) setScrollOffset((prev) => Math.min(prev + 1, maxOffset))
    else if (input === 'j' || key.downArrow) setScrollOffset((prev) => Math.max(prev - 1, 0))
    else if (input === 'g') setScrollOffset(maxOffset)
    else if (input === 'G') setScrollOffset(0)
  })

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Header agents={agents} now={now} paused={paused} view={view.kind} />
      <Box paddingX={1}>
        <Text dimColor>{'─'.repeat(Math.max(columns - 2, 1))}</Text>
      </Box>
      {view.kind === 'feed' ? (
        <Feed
          groups={feedGroups}
          bottomIndex={feedBottom}
          focusIndex={focusIndex}
          agents={agents}
          height={bodyHeight}
          width={columns}
          pulse={now.getSeconds() % 2 === 0}
          now={now}
        />
      ) : view.kind === 'inspect' ? (
        <Inspect
          group={inspectGroup}
          constituents={inspectConstituents}
          agent={agents.find((a) => a.key === inspectGroup?.event.agentKey) ?? null}
          output={inspectOutput}
          scrollOffset={inspectScroll}
          width={columns}
          height={bodyHeight}
          now={now}
        />
      ) : view.kind === 'recap' ? (
        <Recap stats={stats.current} width={columns} height={bodyHeight} now={now} />
      ) : view.kind === 'board' ? (
        <Board
          agents={sortedAgents}
          stats={stats.current}
          selected={Math.min(selected, Math.max(sortedAgents.length - 1, 0))}
          width={columns}
          height={bodyHeight}
          now={now}
        />
      ) : (
        <Detail
          agent={sortedAgents.find((agent) => agent.key === view.agentKey) ?? null}
          agentKey={view.agentKey}
          stats={stats.current}
          scrollOffset={scrollOffset}
          width={columns}
          height={bodyHeight}
          now={now}
        />
      )}
      <Footer view={view.kind} filter={filter} filterMode={filterMode} />
    </Box>
  )
}
