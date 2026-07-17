import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

const HERDR_BIN = process.env['HERDR_BIN_PATH'] ?? 'herdr'

const agentListSchema = z.object({
  result: z.object({
    agents: z.array(
      z
        .object({
          agent: z.string().optional(),
          agent_status: z.string().optional(),
          cwd: z.string().optional(),
          terminal_id: z.string(),
          pane_id: z.string().optional(),
          agent_session: z
            .object({
              agent: z.string().optional(),
              value: z.string()
            })
            .nullish()
        })
        .passthrough()
    )
  })
})

export type HerdrAgent = z.infer<typeof agentListSchema>['result']['agents'][number]

export async function listHerdrAgents(): Promise<HerdrAgent[]> {
  const { stdout } = await execFileAsync(HERDR_BIN, ['agent', 'list'], { timeout: 10_000 })
  return agentListSchema.parse(JSON.parse(stdout)).result.agents
}
