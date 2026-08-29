# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Linux (dev) | amd64 | Admin + dock + overlay themes | yes (automated + browser smoke) |
| Windows 10+ | amd64 | Same | P1 packaged smoke when a Windows box is available |
| macOS | amd64/arm64 | Same | P1 if a Mac is available |

Automated tests are OS-agnostic. Manual OBS audio check once on the operator's streaming OS.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| chat-commands match | POST ingest `  !GG  ` | alert + `is_command` | P0 |
| chat-commands no bang | ingest `gg` | no alert | P0 |
| chat-commands extra words | `!gg please` | ordinary chat | P0 |
| cooldown | two `!gg` within 30s | one alert | P0 |
| commands no score | fire `!gg` | score unchanged; message_count +1 | P0 |
| hide overlay | hide true + `!gg` | overlay skips line; admin/dock show | P0 |
| awards grant | grant Joke | score +10, alert, event | P0 |
| duplicate grant | Joke then Advice same line | +10 then +50, two queued alerts | P0 |
| dock picker | Reward in `/dock/messages` | picker lists seeds; grant works | P0 |
| no user_id | row without user_id | no Reward | P0 |
| alert queue | two fires 1s apart | second waits | P0 |
| alert theme | each overlay theme | splash uses theme tokens | P1 |
| seed delete | delete `gg`, restart | not recreated | P0 |
| empty catalog | delete all awards | picker empty copy | P1 |
| merge events | award A, merge A→B | events on B | P0 |
| a11y | Tab to Reward, Escape | focus returns | P1 |
| i18n | `npm run test:i18n` | RU/EN parity | P0 |
| router guard | no PUT/DELETE/PATCH | still green | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Process restart: cooldowns reset; events remain.
- OBS: source present → splash + tone; source missing → no on-stream effect, app healthy.
- `/ws` drop: alert page reconnects empty; no replay.

## Persistence Migration / Corruption / Recovery

- Temp DB: Up 00001 then 00002; four seeds; delete seed persists across reopen.
- Grant + merge rewrite `viewer_id`.
- Skip intentional DB corruption (same as 6a: fail closed on migrate).

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade path: existing 6a DB + new binary → seeds appear, old viewers intact.
- Downgrade: old binary still boots; alerts URL 404 or static missing — skip shipping old binary against new web tree in the same folder (document).
- Packaged Wails: P1 open `/` Audience Commands.

## Automated Commands / Manual Setup / Fixtures

```text
go test ./...
go test ./... -race
golangci-lint run ./...
npm ci   # if needed
npm run lint
npm test
npm run test:i18n
```

Manual: `go run ./cmd/comm-relay-server`, curl health, admin Reward, dock Reward, `/overlay` vs `/overlay/alert` (transparent), hide flag, OBS audio checkbox.

Seeds: `!gg`, `!hi`, Joke 10, Advice 50.

## Evidence and Explicit Skips

- Skip signing/notary, store installers, multi-OS CI if not in GitHub matrix.
- Skip achievements UI (out of scope).
- Skip custom media upload.
- Record screenshots or short notes for overlay transparency and dock picker overflow.
