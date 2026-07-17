# 기획: Agent Tool History — "우리 agent들, 지금 뭐 하고 있어?"

> PoC(README.md)에서 데이터 확보는 검증 완료. 이 문서는 **어떻게 보여줄 것인가**에 대한 기획.

## 1. 한 줄 컨셉

**여러 agent를 돌려놓은 사람의 관제탑.** herdr 사이드바가 "상태(working/idle)"를 알려준다면,
이 plugin은 그 한 단계 아래 — "**무엇을 하며** working인지"를 실시간으로, 예쁘게, 재미있게 보여준다.

## 2. 레퍼런스에서 배운 것 (marketplace 인기 plugin 분석)

| Plugin | ⭐ | 배울 점 |
|---|---|---|
| herdr-file-viewer | 150 | **split pane에 상주하는 keyboard-first TUI**가 정석. 키바인딩(`prefix+f`) 등록 가이드를 README에 제공. 스크린샷/움짤이 README의 절반 |
| herdr-reviewr | 118 | agent 옆에 붙는 "사이드바" 포지셔닝 — 작업을 방해하지 않는 동반자 |
| herdr-flock | 8 | **감성/재미의 교과서**: agent를 픽셀아트 양으로 의인화, 낮/밤 사이클, 죽으면 묘지에 기록. 숫자가 아니라 "살아있는 존재"로 보여줌 |
| llmtrim | 10 | `pane.report_metadata` 토큰으로 **herdr 사이드바 자체에 badge**를 심음 — TUI를 안 열어도 정보가 보임 |
| ghzinga | 33 | 단일 목적의 작고 클릭 가능한 TUI |

시사점:
- 인기 plugin은 전부 **pane 상주형 TUI** + **원터치 키바인딩** + **비주얼 중심 README**
- 재미 요소(flock)와 실용 요소(file-viewer)를 합치면 차별화 가능
- 사이드바 badge(llmtrim 방식)는 "안 열어도 보이는" 보너스 채널

## 3. 사용 시나리오 (누가 언제 여는가)

1. **글랜스(수시)** — agent 4~5개 돌려놓고 딴 작업 중. "쟤네 지금 뭐하지?" → 2초 안에 파악하고 닫음
2. **모니터링(상주)** — 옆 split에 켜두고 흘러가는 tool 호출을 곁눈질로 감시. 이상 행동(rm -rf, 무한 재시도 루프) 조기 발견
3. **리뷰(사후)** — agent가 done이 된 뒤 "얘가 대체 뭘 한 거야?" 타임라인 복기
4. **리캡(재미)** — 하루 마감하며 "오늘 우리 agent들 얼마나 일했나" 통계 감상

→ 시나리오별로 뷰가 하나씩 대응된다 (아래 4장).

## 4. 화면 설계 — 뷰 3 + 1

하나의 TUI 안에서 `Tab`으로 전환. 기본 진입은 Live Feed.

### 4-1. 📡 Live Feed (기본 뷰) — "관제탑"

전체 agent의 tool 호출이 하나의 스트림으로 흐른다. `tail -f` 감성.

```
 ⚡ agent tools · live                                8 agents · 2 working · 14:32:07
──────────────────────────────────────────────────────────────────────────────────────
 14:31:52  photo-app   ✏️ Edit      src/pages/HomePage.tsx
 14:31:57  photo-app   ✏️ Edit      src/pages/HomePage.tsx          ×2 연속
 14:32:02  photo-app   🖥️ Bash      npx vitest run …HomePage.test.tsx
 14:32:04  herdr-history ● 🌐 WebFetch  herdr.dev/docs/plugins
 14:32:05  book-app       📖 Read      src/lib/api/books.ts
 14:32:07  herdr-history ● 🖥️ Bash      herdr plugin link …                      ← new
──────────────────────────────────────────────────────────────────────────────────────
 [Tab] board  [Enter] agent 상세  [/] filter  [p] pause  [q] quit
```

- agent마다 **고정 색상** (이름에 해시 → 팔레트). 스트림 속에서 색만으로 "누구"인지 식별
- tool마다 **아이콘 + 색**: Read 📖 파랑 / Edit ✏️ 노랑 / Write 📝 주황 / Bash 🖥️ 초록 / WebFetch 🌐 시안 / Agent(서브에이전트) 🤖 보라 / MCP 🔌
- working 중인 agent는 이름 옆 ● 펄스
- 같은 tool 연속 호출은 `×N 연속`으로 접기 (스팸 방지, "리팩토링 몰입 중" 시그널)
- `/` 필터: agent명·tool명·인자 fuzzy 매칭 (예: `/bash rm` → 위험 커맨드 감시)

### 4-2. 🗂 Board — "글랜스"

agent별 카드 그리드. 2초 안에 전체 파악이 목표.

```
┌─ 🟡 photo-app · claude ────────────┐  ┌─ ⚪ book-app · claude ────────────────┐
│ ▂▄▆█▇▅▃▁▂▄▆█  570 calls · 2h 14m      │  │ ▁▁▂▁▁▄▂▁▁▁▁▁  382 calls · idle 32m    │
│ Bash  ████████████ 246                 │  │ Bash  ████████████ 272                 │
│ Write █████ 99      Read ████ 94       │  │ Read  █ 29          Edit ▌18           │
│ ▸ Bash  npx vitest run …test.tsx       │  │ ▸ Bash  python3 -c "names = […]"       │
└────────────────────────────────────────┘  └────────────────────────────────────────┘
┌─ 🟡 herdr-history · claude ────────────┐  ┌─ ⚪ budget-app · claude ────────────┐
│ ▁▁▁▁▁▁▁▂▅█▇▆  24 calls · 12m          │  │ …                                      │
```

- 카드 상단: 상태 이모지(🟡 working / ⚪ idle / 🔴 blocked / ✅ done) + 프로젝트명 + agent 종류
- **활동 sparkline** (최근 30분을 ▁▂▄▆█로): "아까 바빴는데 지금 조용하네"가 한눈에
- top tools 미니 바 차트 + 마지막 호출 1줄
- `hjkl`/화살표로 카드 이동, `Enter`로 상세 진입

### 4-3. 🔍 Detail — "리뷰"

agent 하나의 세션 타임라인 복기.

```
 🔍 photo-app · claude · session a1b2c3d4 · 570 calls
──────────────────────────────────────────────────────────────
 시간대별 활동   09h ▁▁ 10h ▄▆ 11h ██ … 15h ▇▃
 도구 분포      Bash 43% · Write 17% · Read 16% · Edit 13% · 기타 11%
 만진 파일 Top  src/pages/HomePage.tsx (31) · src/App.tsx (14) · …
──────────────────────────────────────────────────────────────
 15:19:44  📖 Read   src/pages/HomePage.test.tsx
 15:19:52  ✏️ Edit   src/pages/HomePage.tsx
 15:19:57  ✏️ Edit   src/pages/HomePage.tsx
 15:20:02  🖥️ Bash   npx vitest run … ✔ 0.8s
──────────────────────────────────────────────────────────────
 [j/k] scroll  [g/G] 처음/끝  [t] tool filter  [Esc] back
```

- tool_use ↔ tool_result를 짝지어 **성공/실패(✔/✘)와 소요 시간** 표시 (transcript에 둘 다 있음)
- "만진 파일 Top"은 Edit/Write/Read의 file_path 집계 — 리뷰할 때 가장 궁금한 정보

### 4-4. 🌙 Recap — "재미" (Tab 마지막 또는 `r`)

flock의 감성을 통계로. 하루를 마감하는 리캡 카드.

```
 🌙 오늘의 리캡 · 2026-07-17
 ────────────────────────────────────────────
 총 1,391 tool calls · agent 6명 · 활동 시간 7h 12m

 🏆 오늘의 일꾼     photo-app (570 calls)
 🔨 Bash 장인      book-app (272회 — 전체의 71%가 Bash)
 📚 다독왕         photo-app (Read 94회)
 🔥 최장 콤보      Edit ×12 연속 (photo-app 15:19)
 🌐 바깥 구경      herdr-history (WebFetch 4회)
 🤫 조용한 하루    api-server (0 calls)
```

- 뱃지/칭호는 하드코딩 규칙 6~8개로 시작 (구현 쉬움, 재미 큼)
- 스크린샷 찍어 공유하고 싶어지는 화면이 목표 — README 소재이자 바이럴 포인트

## 5. 감성 가이드 (비주얼 원칙)

- **터미널 테마 존중**: 배경색 강제하지 않음. ANSI 256 기본, truecolor 가능 시 업그레이드
- **색은 의미**: agent = 고정 색상(식별), tool = 카테고리 색(행위 종류), 상태 = 신호등. 세 축이 섞이지 않게
- 아이콘은 이모지 기본 + `--ascii` 폴백 (Nerd Font 강제하지 않음)
- 애니메이션은 딱 두 곳만: working 펄스(●), 새 이벤트 하이라이트 1초 후 페이드. 과하면 촌스러움
- 밀도 조절: 기본은 여백 있는 카드, `c`(compact)로 정보 밀도 토글

## 6. 사이드바 badge (보너스 채널, llmtrim 방식)

TUI를 안 열어도 herdr 사이드바에서 보이도록, 데몬이 각 agent pane에
`pane.report_metadata` 토큰을 주기적으로 리포트:

```
claude · photo-app   [✏️ Edit ×12]   ← 최근 5분간 주력 tool
```

- 토큰 값 80자 제한 → "주력 tool + 횟수" 한 조각만
- M3에서 옵션(config)으로 제공. 끌 수 있어야 함

## 7. 기술 결정

### TUI 스택: **TypeScript + Ink** (권장)

| 후보 | 장점 | 단점 |
|---|---|---|
| **TS + Ink** ✅ | 사용자 주력 스택, React 컴포넌트로 뷰 3개 조립 용이, `[[build]]`에 `npm ci && npm run build`면 배포 끝 | 기동 ~300ms (상주형이라 무관) |
| Rust + ratatui | 인기 plugin 다수가 사용, 성능 | 개발 속도, 학습 비용 |
| Python + Textual | PoC 연장선 | 배포 시 의존성 관리 번거로움 |

- 렌더링 60fps가 필요한 게 아니라 3~5초 주기 갱신 + 이벤트 push → Ink로 충분
- 코드 구조: `데이터 계층(collector)` / `상태(store)` / `뷰(Ink 컴포넌트)` 분리 — 뷰는 순수하게

### 데이터 계층 (PoC에서 검증된 것 + 보완)

- 소스 오브 트루스: **transcript 파일** (`~/.claude/projects/*/<sid>.jsonl`, `~/.codex/sessions/**/rollout-*<sid>.jsonl`)
- 신선도: polling 대신 **`fs.watch`로 transcript tail** + **`events.subscribe`** (`pane.agent_status_changed`, `pane.created/closed`)로 agent 목록 동기화
- PoC에서 발견한 한계 대응:
  - session id TTL 소실 → `terminal_id → last session id` 캐시 (plugin state dir에 저장)
  - agent 미검출 pane(`unknown`) → 목록에서 제외
  - subagent(sidechain) tool 호출 → transcript의 `isSidechain`으로 구분, Detail에서 들여쓰기 표시
- 파서는 agent별 어댑터 패턴: `claude.ts`, `codex.ts` → 이후 gemini 등 추가 용이

### 열기 경로

- `herdr plugin pane open … --placement split` (기본, file-viewer 방식) + overlay/tab 옵션
- README에 키바인딩 스니펫 제공: `prefix+t` → "지금 뭐해?" 원터치

## 8. 로드맵

| 마일스톤 | 내용 | 완성 기준 | 상태 |
|---|---|---|---|
| **M1** | Ink 골격 + 데이터 계층(watch 기반) + **Live Feed** | split에 켜두고 실시간 스트림이 흐른다 | ✅ 완료 |
| **M2** | **Board + Detail** + 키보드 내비게이션 + 필터 | 글랜스→드릴다운 동선 완성 | ✅ 완료 |
| **M3** | **Recap + 뱃지** + 사이드바 badge(옵션) | 스크린샷 찍고 싶은 화면 | ✅ 완료 |
| **M4** | polish: `--ascii` 폴백, config, README(움짤!), topic `herdr-plugin` 달고 배포 | marketplace에 뜬다 | ✅ 완료 (GitHub 공개 + topic 부착) |

M1이 끝나면 그 시점부터 실사용하며 (dogfooding) M2~M3 우선순위를 조정한다.

## 9. 리스크

- **transcript 포맷은 비공식**: Claude Code/Codex 업데이트로 스키마가 바뀔 수 있음 → 파서에 방어적 파싱 + "알 수 없는 레코드는 건너뜀" 원칙, 어댑터별 스냅샷 테스트
- **개인정보**: transcript에는 프롬프트 전문이 있음. 이 plugin은 **tool 호출 메타데이터만** 읽고 표시한다는 원칙을 README에 명시
- **성능**: 570+ 호출 세션도 있었음 → 최초 로드는 전체 파싱, 이후 append-only tail. 인자 문자열은 표시 직전 truncate
