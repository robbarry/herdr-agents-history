# Agent Tool History

**See what your agents are actually *doing* — a live, keyboard-driven TUI for [herdr](https://herdr.dev) that streams every tool call your AI coding agents make.**

herdr's sidebar tells you an agent is `working`. This plugin tells you *what it's working with*: every `Bash`, `Edit`, `Read`, `WebFetch` — across all your agents, in one pane, in real time. No terminal scraping: it reads each agent's own session transcript, so tool names, arguments, and timestamps are exact.

Supports **Claude Code** and **Codex** sessions out of the box.

## Views

One pane, four views. `Tab` and single keys move between them.

### 📡 Live Feed (default)

Every agent's tool calls as one merged stream — `tail -f` for your whole fleet. Agents get stable colors, tools get icons, consecutive repeats collapse into `×N`.

```
 ⚡ agent tools · live                     7 agents · 2 working · 14:32:07
 ──────────────────────────────────────────────────────────────────────────
 14:31:52   summer-camera      📝 Edit    src/pages/HomePage.tsx
 14:31:57   summer-camera      📝 Edit    src/pages/HomePage.tsx ×2
 14:32:02   summer-camera      💻 Bash    npx vitest run HomePage.test.tsx
 14:32:04   herdr-history    ● 🌐 WebFetch herdr.dev/docs/plugins
 [Tab] board  [r] recap  [/] filter  [p] pause  [q] quit
```

Filter with `/` — try `/bash rm` to watch for dangerous commands across every agent at once.

### 🗂 Board

One card per agent: status, an activity sparkline, top tools, last call. Two seconds to know what the whole fleet is up to. Arrow keys / `hjkl` to select, `Enter` to drill down.

```
 ╭─────────────────────────────────────────────╮
 │ ● summer-camera                      claude │
 │ ▂▄▆█▇▅▃▁▂▄▆█  570 calls                    │
 │ Bash   ████████████ 246                     │
 │ Write  █████ 99                             │
 │ ▸ 💻 npx vitest run HomePage.test.tsx       │
 ╰─────────────────────────────────────────────╯
```

### 🔍 Detail

One agent's session, reviewable: hourly activity, tool distribution, most-touched files, and a scrollable timeline (`j/k`, `g/G`).

### 🌙 Recap (`r`)

Today's wrap-up with awards — who worked hardest, the longest same-tool combo, the terminal artisan, the bookworm, and who had a quiet day. Screenshot material.

## Sidebar badges

While the TUI is open it also reports each agent's recently-dominant tool into the herdr sidebar as a status badge (`💻 Bash ×12`), so you get a glance-level signal without even opening the pane. Disable with `--no-badge` or in the config file.

## Install

```bash
herdr plugin install speardragon/herdr-agents-history
```

Requires herdr ≥ 0.7 and Node.js ≥ 20 (build runs `npm ci && npm run build`).

Bind a key in `~/.config/herdr/config.toml` so one press opens it:

```toml
[[keys.command]]
key = "prefix+h"
type = "shell"
command = "herdr plugin pane open --plugin cdragon.agent-tool-history --entrypoint feed --placement split --direction right"
```

(pick any key not already bound in your config — check with `grep 'key = ' ~/.config/herdr/config.toml`)

Or open it manually:

```bash
herdr plugin pane open --plugin cdragon.agent-tool-history --entrypoint feed
```

## Configuration

`config.json` in the plugin config dir (`herdr plugin config-dir cdragon.agent-tool-history`):

```json
{
  "ascii": false,
  "badge": true
}
```

- `ascii` — replace emoji icons with plain ASCII (also: `--ascii` flag)
- `badge` — sidebar status badges (also: `--no-badge` flag)

## How it works & privacy

herdr exposes each pane's native agent **session id**. The plugin resolves that id to the agent's own local transcript (`~/.claude/projects/…/<session>.jsonl`, `~/.codex/sessions/…/rollout-*.jsonl`) and tails it.

- Reads **tool-call metadata only** (tool name, argument summary, timestamp). Prompts and conversation content are never displayed.
- Everything stays on your machine; the plugin makes no network requests.
- Transcript formats are unofficial: unknown records are skipped defensively, and agent updates may require a parser refresh.

## Development

```bash
git clone https://github.com/speardragon/herdr-agents-history
cd herdr-agents-history
npm install && npm run build
herdr plugin link .

npm test        # parser & stats unit tests
npm run dev     # run the TUI directly (inside a herdr pane)
```

`docs/POC.md` (Korean) documents the original feasibility study, and `PLAN.md` the design. A one-shot Python PoC lives in `bin/agent_tools.py` and doubles as the `show` action.

## License

MIT
