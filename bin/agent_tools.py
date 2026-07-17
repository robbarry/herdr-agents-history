#!/usr/bin/env python3
"""PoC: show which tools each herdr-managed agent has been using.

Data flow:
  1. `herdr agent list` -> panes with native agent session ids
  2. session id -> local transcript file
       claude: ~/.claude/projects/<munged-cwd>/<session>.jsonl
       codex:  ~/.codex/sessions/YYYY/MM/DD/rollout-*-<session>.jsonl
  3. parse tool calls out of the transcript
"""

import argparse
import collections
import datetime
import glob
import json
import os
import subprocess
import sys
import time

HERDR = os.environ.get("HERDR_BIN_PATH", "herdr")
HOME = os.path.expanduser("~")

DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
GREEN = "\033[32m"

STATUS_COLOR = {"working": YELLOW, "blocked": "\033[31m", "done": GREEN, "idle": DIM}


def list_agents():
    out = subprocess.run([HERDR, "agent", "list"], capture_output=True, text=True, timeout=10)
    if out.returncode != 0:
        raise RuntimeError(f"herdr agent list failed: {out.stderr.strip()}")
    return json.loads(out.stdout)["result"]["agents"]


def find_transcript(agent, session_id):
    if agent == "claude":
        hits = glob.glob(f"{HOME}/.claude/projects/*/{session_id}.jsonl")
    elif agent == "codex":
        hits = glob.glob(f"{HOME}/.codex/sessions/*/*/*/rollout-*{session_id}.jsonl")
    else:
        hits = []
    return hits[0] if hits else None


def claude_tools(path):
    """Yield (timestamp, tool_name, detail) from a Claude Code transcript."""
    with open(path, errors="replace") as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            content = (rec.get("message") or {}).get("content")
            if not isinstance(content, list):
                continue
            for block in content:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    inp = block.get("input") or {}
                    detail = (
                        inp.get("command")
                        or inp.get("file_path")
                        or inp.get("pattern")
                        or inp.get("url")
                        or inp.get("description")
                        or ""
                    )
                    yield rec.get("timestamp", ""), block.get("name", "?"), str(detail)


def codex_tools(path):
    """Yield (timestamp, tool_name, detail) from a Codex rollout transcript."""
    with open(path, errors="replace") as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = rec.get("payload") or {}
            ptype = payload.get("type")
            if ptype not in ("function_call", "custom_tool_call", "tool_search_call"):
                continue
            name = payload.get("name", ptype)
            detail = payload.get("arguments") or payload.get("input") or ""
            if isinstance(detail, str) and detail.startswith("{"):
                try:
                    args = json.loads(detail)
                    detail = args.get("cmd") or args.get("command") or args.get("path") or detail
                except json.JSONDecodeError:
                    pass
            yield rec.get("timestamp", ""), name, str(detail)


def local_hms(ts):
    try:
        dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%H:%M:%S")
    except ValueError:
        return ts[11:19] if len(ts) >= 19 else ts


def render(limit):
    lines = []
    agents = list_agents()
    lines.append(f"{BOLD}Agent Tool History{RESET}  {DIM}{time.strftime('%H:%M:%S')}  ({len(agents)} agents){RESET}")
    for a in agents:
        agent = a.get("agent", "?")
        status = a.get("agent_status", "unknown")
        cwd = (a.get("cwd") or "").replace(HOME, "~")
        session = (a.get("agent_session") or {}).get("value")
        color = STATUS_COLOR.get(status, "")
        lines.append("")
        lines.append(f"{BOLD}{CYAN}{agent}{RESET} {color}[{status}]{RESET} {DIM}{cwd}{RESET}")

        if not session:
            lines.append(f"  {DIM}no native session id reported{RESET}")
            continue
        path = find_transcript(agent, session)
        if not path:
            lines.append(f"  {DIM}transcript not found for session {session[:8]}…{RESET}")
            continue

        parser = claude_tools if agent == "claude" else codex_tools
        calls = list(parser(path))
        counts = collections.Counter(name for _, name, _ in calls)
        top = ", ".join(f"{n}×{c}" for n, c in counts.most_common(6))
        lines.append(f"  {DIM}{len(calls)} tool calls — {top}{RESET}")
        for ts, name, detail in calls[-limit:]:
            hhmm = local_hms(ts)
            detail = detail.replace("\n", " ")[:80]
            lines.append(f"  {DIM}{hhmm}{RESET}  {BOLD}{name}{RESET}  {detail}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--watch", action="store_true")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--interval", type=float, default=3.0)
    args = ap.parse_args()

    if args.watch:
        try:
            while True:
                frame = render(args.limit)
                sys.stdout.write("\033[2J\033[H" + frame + f"\n\n{DIM}refreshing every {args.interval:g}s — ctrl+c to quit{RESET}\n")
                sys.stdout.flush()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            pass
    else:
        print(render(args.limit))


if __name__ == "__main__":
    main()
