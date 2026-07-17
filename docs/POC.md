# Agent Tool History (herdr plugin)

herdr 세션의 각 agent가 **어떤 tool을 사용해왔는지** 한눈에 보여주는 plugin.

## PoC 결론: 가능 ✅

herdr plugin API에는 tool 사용 정보가 직접 노출되지 않지만, 아래 경로로 완전한 tool 사용 내역을 얻을 수 있다:

1. `herdr agent list` → 각 pane의 `agent_session.value`에 **native session id**(UUID)가 노출됨
2. session id → agent별 로컬 transcript 파일
   - **claude**: `~/.claude/projects/<munged-cwd>/<session-id>.jsonl`
     (구현은 `~/.claude/projects/*/<session-id>.jsonl` glob으로 cwd munging 회피)
   - **codex**: `~/.codex/sessions/YYYY/MM/DD/rollout-*-<session-id>.jsonl`
3. transcript 파싱
   - claude: `message.content[]` 중 `type == "tool_use"` 블록 (`name`, `input`)
   - codex: `payload.type`이 `function_call` / `custom_tool_call` / `tool_search_call`인 레코드

터미널 출력 스크래핑(`pane read`) 없이 **구조화된 원본 데이터**를 그대로 쓸 수 있어서, tool 이름·인자·타임스탬프가 전부 정확하게 나온다.

## 사용

```bash
herdr plugin link /path/to/herdr-agents-history

# 3초마다 갱신되는 overlay
herdr plugin pane open --plugin cdragon.agent-tool-history --entrypoint history

# 일회성 출력 (action)
herdr plugin action invoke cdragon.agent-tool-history.show
```

스크립트 단독 실행도 가능:

```bash
python3 bin/agent_tools.py --once --limit 5
python3 bin/agent_tools.py --watch --interval 3
```

## 구조

- `herdr-plugin.toml` — manifest. overlay pane(`--watch`) + action(`--once`) 선언
- `bin/agent_tools.py` — `herdr agent list` → transcript 해석 → agent별 tool 통계/최근 호출 렌더링

## PoC에서 확인된 한계 / 다음 단계

- **session id가 항상 있지는 않음**: codex pane이 idle로 바뀐 뒤 `agent_session`이 사라지는 경우를 관찰함 (herdr metadata TTL로 추정). → terminal_id별로 마지막 session id를 캐시하거나, cwd 기준 최신 rollout 파일 fallback 필요.
- **plugin 자신의 pane이 `? [unknown]`으로 목록에 섞임** → agent 미검출 pane은 필터링.
- **polling 기반**: socket API에 `events.subscribe`(`pane.agent_status_changed` 등)가 있어서 이벤트 기반 + transcript 파일 watch로 개선 가능.
- **claude/codex만 지원**: 다른 agent는 transcript 포맷별 파서 추가 필요.
- claude transcript의 timestamp는 UTC → 로컬 시간으로 변환해 표시함 (구현 완료).

## 참고

- Plugin docs: https://herdr.dev/docs/plugins/ — manifest 스펙, 주입되는 env (`HERDR_BIN_PATH`, `HERDR_PLUGIN_*` 등)
- Socket API: https://herdr.dev/docs/socket-api/ — plugin API는 별도 SDK 없이 herdr CLI/socket 전체
- Marketplace 등록: public repo에 GitHub topic `herdr-plugin` + `herdr-plugin.toml`만 있으면 자동 인덱싱
