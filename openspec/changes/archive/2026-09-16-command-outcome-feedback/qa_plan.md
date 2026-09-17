# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP/WebSocket fixtures | yes — CI gate |
| Current Chromium-family browser | host | `/overlay`, `/`, `/dock/messages`, 1024 and 375 px | yes — UI gate |
| OBS Browser Source | host when available | transparent `/overlay` | yes if OBS present; else skip with note |
| Windows/macOS/Linux packaged desktop | release runners | unchanged packaging | skip — no installer/schema change |

## Behavior and UI Scenarios

| Spec/UI ref | Steps/check | Expected | P0/P1 |
|-------------|-------------|----------|-------|
| `chat-commands` fire | Send `!gg` with enabled command | One alert; `command_outcome` `fired`; admin/dock accepted | P0 |
| `chat-commands` cooldown | Second `!gg` within cooldown | No second alert; outcome `cooldown` with remaining ms > 0 | P0 |
| `obs-overlay` default freeze | Overlay flag off; cooldown line | Frozen row ~5 s, no ticking seconds | P0 |
| `obs-overlay` hide successes | `hide_command_messages` true, cooldown flag false | Successful `!gg` hidden; cooldown still flashes | P0 |
| `obs-overlay` hide cooldown | `hide_command_cooldown_overlay` true | Overlay shows no cooldown row; admin/dock still frozen | P0 |
| `admin-and-dock` leaderboard | Fire `show_leaderboard` | No splash; admin/dock accepted | P0 |
| `admin-and-dock` countdown | Frozen row in Live and dock | Remaining seconds tick | P0 |
| `http-api` restore | Reload admin/dock before cooldown ends | Frozen chrome + remaining time returns | P0 |
| `websocket-feed` ignore | Leaderboard page receives outcome | Ranking UI unchanged | P1 |
| unknown bang | Send `!unknown` | Ordinary chat, no outcome | P0 |
| reduced motion | Overlay cooldown with `prefers-reduced-motion` | Freeze visible without aggressive pulse | P1 |
| transparent overlay | `/overlay` background | Still transparent | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Restart the process: cooldown and restore map clear; next `!gg` fires.
- No connector outbound chat. No new files besides `config.json` key.
- Sleep/wake: no extra contract.

## Persistence Migration / Corruption / Recovery

- No SQLite migration. Legacy `config.json` without the new key behaves as overlay-cooldown-shown (false).
- Invalid non-boolean for the new key is a field error; other settings remain.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip packaged signing/install. Headless `go build ./cmd/comm-relay-server` is enough. Previous binary ignoring the new WS type and config key is the rollback.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./internal/command ./internal/api ./internal/config ./internal/observability
go test -race ./internal/command ./internal/api ./internal/config
go test ./...
golangci-lint run ./...
npm ci
npm run lint
npm run test:i18n
openspec validate command-outcome-feedback --strict
```

Manual: run the server with `-web ./web`, open `/`, `/overlay`, `/dock/messages`, and use an existing test command fire path or ingest fixture.

## Evidence and Explicit Skips

Required: automated command logs; overlay screenshots of freeze vs hidden cooldown; admin/dock countdown screenshot; note if OBS is unavailable. Signing, tray, notifications, and connector write tests are skipped.
