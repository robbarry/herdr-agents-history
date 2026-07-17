import { Box, Text } from 'ink'
import type { AgentSnapshot } from '../types.js'

const VIEW_LABEL: Readonly<Record<string, string>> = {
  feed: 'live',
  board: 'board',
  detail: 'detail',
  recap: 'recap'
}

interface Props {
  readonly agents: AgentSnapshot[]
  readonly now: Date
  readonly paused: boolean
  readonly view: string
}

export function Header({ agents, now, paused, view }: Props) {
  const working = agents.filter((agent) => agent.status === 'working').length
  const clock = now.toTimeString().slice(0, 8)
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text>
        <Text color="yellowBright">⚡ agent tools</Text>
        <Text dimColor> · {VIEW_LABEL[view] ?? view}{paused ? ' (paused)' : ''}</Text>
      </Text>
      <Text dimColor>
        {agents.length} agents · {working} working · {clock}
      </Text>
    </Box>
  )
}
