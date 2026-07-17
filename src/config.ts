import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface Config {
  readonly ascii: boolean
  readonly badge: boolean
}

const DEFAULTS: Config = { ascii: false, badge: true }

let current: Config = DEFAULTS

/**
 * Precedence: defaults < config.json in the plugin config dir < CLI flags.
 * Config file example: { "ascii": true, "badge": false }
 */
export function initConfig(argv: readonly string[]): Config {
  const dir =
    process.env['HERDR_PLUGIN_CONFIG_DIR'] ?? path.join(os.homedir(), '.config', 'herdr-agent-tool-history')
  let fromFile: Partial<Config> = {}
  try {
    fromFile = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')) as Partial<Config>
  } catch {
    // no config file is the normal case
  }
  current = {
    ascii: argv.includes('--ascii') ? true : fromFile.ascii ?? DEFAULTS.ascii,
    badge: argv.includes('--no-badge') ? false : fromFile.badge ?? DEFAULTS.badge
  }
  return current
}

export function getConfig(): Config {
  return current
}
