# QA Evidence — xp-contribution-foundation

Date: 2026-09-03
Branch: `cursor/xp-contribution-foundation-c4e4`
Implementation: `81af9c1` plus RU XP copy follow-up.

## Environment

- Linux amd64 Cloud Agent; Go `1.26.3`; Node `v22.22.2`; OpenSpec `1.12.0`; golangci-lint `v2.12.2`.
- Headless server: `go run ./cmd/comm-relay-server -config /tmp/comm-relay-xp-qa/config.json -web /workspace/web -addr 127.0.0.1:17877`
- Browser: Chromium at `#settings/data`, `#audience`, `#audience/awards`, `/overlay/leaderboard`.

## Required automated commands

| Command | Result |
|---|---|
| `npm ci` | **PASS** |
| `npm test` | **PASS** — 88 tests, 0 failed |
| `npm run test:i18n` | **PASS** — 642 keys |
| `npm run lint` | **PASS** — `eslint web/` |
| `go test ./...` | **PASS** |
| `go test -race ./internal/store/... ./internal/api/...` | **PASS** |
| `golangci-lint run ./...` | **PASS** — 0 issues (after gofmt/shadow/unused fix) |
| `go build ./...` | **PASS** |
| `openspec validate xp-contribution-foundation --strict` | **PASS** — Change is valid |
| `git diff --check` | **PASS** |

## Behavior matrix

| Scenario | P0/P1 | Result | Evidence |
|---|---|---|---|
| No per-message XP; two lines in interval | P0 | **PASS** | `internal/store/activity_test.go` |
| First-line grant, no alert | P0 | **PASS** | store + `internal/api` ingest tests |
| Session cap | P0 | **PASS** | store activity tests |
| `activity_xp` 0 disables | P0 | **PASS** | store activity tests |
| Restart keeps session cap | P0 | **PASS** | store reopen tests |
| New stream zeros session XP | P0 | **PASS** | store tests |
| Merge sums XP and activity | P0 | **PASS** | store merge tests |
| Award Joke adds XP + alert `points` | P0 | **PASS** | `internal/api/awards_grant_test.go`; HTTP Spotter grant +25 |
| Extra seeds; delete stays deleted | P0 | **PASS** | `internal/store/catalog_test.go`; catalog UI |
| `!gg` does not add extra XP | P0 | **PASS** | `internal/api/command_fire_test.go` |
| Negative activity fields | P0 | **PASS** | `internal/api/activity_config_test.go`; live HTTP 400 |
| HTTP/WS `xp`, omit `score` | P0 | **PASS** | `GET /api/leaderboard` and `GET /api/viewers` after grant |
| Admin/dock copy XP | P0 | **PASS** | Browser Settings/Audience; leftover RU “очки” on period hint/card meta fixed after smoke |
| Sort stored `score` as `xp` | P0 | **PASS** | `web/admin/js/audience-xp-sort.test.js` |
| Settings save applies | P0 | **PASS** | Browser: interval 300 → 120, reload kept 120 |
| Anonymous line | P0 | **PASS** | store ApplyChat empty user_id tests |
| Overlay alert unchanged for awards | P0 | **PASS** | award grant tests; activity has no alert |
| Pre-00003 score 42 → xp 42 | P0 | **PASS** | `TestOpen_WhenPreMigrationScore42_ExpectXP42AfterMigrate` |
| Long RU labels 125% | P1 | **PASS** (100%) | Settings Data in RU readable, not clipped |
| Reduced motion | P1 | **SKIP** | No award splash browser pass this session |
| Windows + OBS | P0 matrix | **SKIP** | Cloud Linux browser only; OBS not available |
| macOS Retina | P1 | **SKIP** | Runner unavailable |
| Signing / notarize / publish | — | **SKIP** | Distribution plan forbids |

## Manual smoke (D.2)

- Settings activity fields, save, reload: **PASS**
- Audience XP column 25 after Spotter grant: **PASS**
- Awards catalog lists Spotter/Intel/Expert/Meme/Clutch Help/MVP: **PASS**
- `/overlay/leaderboard` after reload shows 25 on transparent page: **PASS** (chips layout; no admin chrome)

## Explicit skips

Signing, notarization, camera/mic, community awards, Credits, command media, Windows/macOS OBS, Live Reward picker (no live chat messages; HTTP grant used instead).
