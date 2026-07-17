import { render } from 'ink'
import { App } from './app.js'
import { initConfig } from './config.js'

initConfig(process.argv.slice(2))

const enterAltScreen = '\x1b[?1049h\x1b[H'
const leaveAltScreen = '\x1b[?1049l'

process.stdout.write(enterAltScreen)
const restore = () => process.stdout.write(leaveAltScreen)
process.on('exit', restore)

const { waitUntilExit } = render(<App />, { exitOnCtrlC: true })
await waitUntilExit()
