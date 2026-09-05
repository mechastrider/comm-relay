# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 10/11 + supported OBS | x86-64 | Default and cockpit leaderboard; 100%/150% scaling; keyboard Settings | yes, P0 |
| Current Chromium-family browser | Host architecture | Light/dark admin; zoom 100%/125%; RU/EN | yes, P0 automated + manual |
| Linux current supported browser | Existing | Default theme; 100% | P1 |
| macOS current supported browser | Existing | Default theme; Retina | P1 when available |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| `viewer-stats`: no per-message XP | Ingest two identified lines inside the interval | `message_count` 2; XP increased only once by `activity_xp` | P0 |
| `viewer-stats`: first-line grant | First identified line of a session with defaults | XP +1 session/day/all; no `alert` frame | P0 |
| `viewer-stats`: session cap | 10 activity grants then another eligible line | `message_count` grows; XP unchanged | P0 |
| `viewer-stats`: disabled | `activity_xp` 0 | Counted lines never add XP | P0 |
| `viewer-stats`: restart | 3 grants, restart, line inside interval | Still 3 grants; no extra XP | P0 |
| `viewer-stats`: new stream | Confirm New stream after XP | Session XP 0; day/all unchanged; activity cap reset | P0 |
| `viewer-stats`: merge | Merge two viewers with XP and activity | Sums XP windows; session activity counts combine | P0 |
| `operator-rewards`: grant | Reward Joke | XP +10 all windows; award alert still uses `points` | P0 |
| `operator-rewards`: seeds | Fresh and upgraded DB | New ids present; Joke/Advice untouched; delete Spotter survives restart | P0 |
| `chat-commands`: `!gg` | Fire command after activity already granted | `message_count` +1; command does not add XP; command alert still fires | P0 |
| `config-store`: validation | Negative activity fields | HTTP field errors; config unchanged | P0 |
| `websocket-feed` / `obs-leaderboard` | Award and activity | Frames/HTTP use `xp`, omit `score`; activity has no alert | P0 |
| `admin-and-dock`: copy | Audience, card, Live, Settings, overlay | XP labels; no points-per-message progress control | P0 |
| `admin-and-dock`: sort | Sort XP; stored `score` preference | Desc/asc/none; old `score` key sorts XP | P0 |
| Settings save | Change interval/limit/xp, save, send lines | New policy applies without restart | P0 |
| Anonymous line | Empty `user_id` | No viewer/XP | P0 |
| Overlay alert | Grant award | Unchanged award splash; activity never splashes | P0 |
| Long RU labels | Russian UI at 125% zoom | Settings fields and table header remain usable | P1 |
| Reduced motion | Grant award | Existing reduced-motion award behavior; activity still silent | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Start against a pre-`00003` DB copy; confirm migrate then serve.
- Kill the process mid-ingest (best-effort) and confirm no split message_count vs activity on replay fixtures.
- Sleep/wake: next line after interval is eligible.
- Two admin tabs: both show XP after grant; no native IPC.

## Persistence Migration / Corruption / Recovery

- Fixture: `score` 42 → `xp` 42; activity columns default.
- Invalid `activity_interval_seconds` -1 rejected.
- Corrupt config still uses existing load-error path.
- `localStorage` `column: score` sorts XP.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade an existing config dir; open Audience and Settings; grant Spotter; confirm OBS leaderboard after reload.
- Do not run an old binary on the migrated DB except as a documented failure/rollback-from-backup check.
- Headless `GET /health` plus leaderboard JSON smoke.

## Automated Commands / Manual Setup / Fixtures

Run from repository root:

```bash
npm ci
npm test
npm run test:i18n
npm run lint
go test ./...
go test -race ./internal/store/... ./internal/api/...
golangci-lint run ./...
go build ./...
openspec validate xp-contribution-foundation --strict
git diff --check
```

Fixtures: pre-migration SQLite with score; activity clock/interval; merge; seed delete; config with only `points_per_message`. Manual: Windows admin + `/overlay/leaderboard` + dock Reward.

## Evidence and Explicit Skips

Record test command output. Manual: Settings activity fields, Audience XP column, one award grant, leaderboard Browser Source. Skip signing, notarization, camera/mic, community awards, Credits, command media, Linux/macOS OBS if runners are unavailable (P1). Downgrade-without-backup is expected to fail and needs only a brief confirmation, not a green path.
