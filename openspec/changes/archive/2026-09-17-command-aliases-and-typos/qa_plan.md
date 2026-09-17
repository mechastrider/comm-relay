# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP/WS fixtures | yes — CI gate |
| Current Chromium-family browser | host | Admin Commands editor ~1280×800; overlay 1920×1080 | yes — UI/P0 |
| Overlay `/overlay` | host | transparent background | yes — P0 regression |
| `/dock/messages` | host | command chrome | yes — P0 alias/typo line |
| OBS Browser Source | host when available | unchanged | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| chat-commands / alias fires | Create `heat`, alias `heate`, send `!heate` | Alert `heat`; `is_command`; outcome trigger `heat` | P0 |
| chat-commands / alias cooldown | `!heat` then `!heate` inside cooldown | Second is cooldown, no second alert | P0 |
| chat-commands / unique typo | `heat` without alias `heate`; send `!heate` | Matches `heat` | P0 |
| chat-commands / short seed | Send `!go` with only `gg` | Ordinary chat | P0 |
| chat-commands / ambiguous | Enabled `heat` and `heal`; token dist 1 from both | Ordinary chat | P0 |
| chat-commands / extra words | `!heat please` | Ordinary chat | P0 |
| chat-commands / disabled exact | Disabled `heat`; send `!heat` | Ordinary chat; no fuzzy to neighbor | P0 |
| http-api / aliases list | GET `/api/commands` after save | `aliases` array | P0 |
| http-api / collision | Alias equals other trigger | HTTP 400 field `aliases` | P0 |
| http-api / trigger vs alias | New trigger equals other alias | HTTP 400 field `trigger` | P0 |
| http-api / omit aliases | Create without field | `aliases` `[]` | P0 |
| admin-and-dock / editor | Add `heate` on `heat`, save, reload | Textarea and list show alias; field error on conflict | P0 |
| admin-and-dock / leaderboard | Aliases on show_leaderboard command | Field visible; `!alias` requests board | P1 |
| websocket-feed / typed text | Overlay/dock show `!heate` | Typed line; canonical outcome | P0 |
| overlay hide commands | `hide_command_messages` true; alias fire | Overlay hides success line as today | P1 |
| packimport | pack.yaml aliases | Stored; invalid uniqueness fails apply | P1 |
| catalog height | Editor ~700px pane | Header pinned; aliases not clipped | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new files outside `comm-relay.db`.
- Process restart: aliases persist; in-memory cooldown resets.
- Two admin tabs: save aliases on one, refresh the other.

## Persistence Migration / Corruption / Recovery

- Up from 19: `command_aliases` exists; seeds have zero aliases; `!gg` still exact.
- Down to 19 then Up 20: table recreated empty.
- Duplicate alias insert: 400, catalog unchanged.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./...`. Rollback: previous binary exact-matches only.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./internal/store ./internal/command ./internal/api ./internal/packimport -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate command-aliases-and-typos --strict
```

Manual: `go run ./cmd/comm-relay-server -config ./var/data/config.json -web ./web` (or `-addr` if 17877 is taken). Create command `heat` (or rename a spare trigger) in Audience → Commands.

## Evidence and Explicit Skips

Required: matcher/API test names; migration test; admin editor screenshot with aliases + conflict error; overlay/dock screenshot of typed `!heate` with command chrome; `/overlay` transparency smoke. Skip OBS and packaged desktop unless already running. Signing/tray/notifications skipped.
