# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP fixtures | yes — CI gate |
| Current Chromium-family browser | host | `/` Audience, 1280 and 375 px | yes — UI gate |
| Overlay `/overlay` | host | transparent background | yes — regression smoke |
| OBS Browser Source | host when available | unchanged | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI ref | Steps/check | Expected | P0/P1 |
|-------------|-------------|----------|-------|
| `http-api` list field | `GET /api/viewers` | Each viewer has integer `session_count` | P0 |
| `viewer-stats` three streams | Viewer with messages in 3 sessions | List and get `session_count` 3; table shows 3 | P0 |
| `viewer-stats` award-only | Award in a session with 0 messages | That session does not increase Streams | P0 |
| `admin-and-dock` column | Audience → Viewers | Localized Streams/Эфиры column | P0 |
| `admin-and-dock` period | Switch session → day → all | XP/Messages change; Streams values stay | P0 |
| `admin-and-dock` sort | Activate Streams | Desc then asc then last-activity; `aria-sort` | P0 |
| `admin-and-dock` card | Open a viewer with `session_count` 3 | Card shows 3 streams; history still below | P0 |
| `admin-and-dock` narrow | 375 px Audience + open sheet | Streams column/card reachable without clipping | P1 |
| overlay regression | Open `/overlay` | Transparent background; chat still works | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new config.json keys. No SQLite migration.
- Restart preserves historical `viewer_session_stats`; directory recounts on read.
- New stream zeros period session XP/messages; lifetime Streams does not reset.

## Persistence Migration / Corruption / Recovery

- None. Invalid `commRelay.audienceSort` column `streams` on an old build falls back to last-activity; after this change it is valid.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./cmd/comm-relay-server` is enough. Rollback: revert; extra JSON field is ignored by older admin JS.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./internal/store ./internal/api -count=1
go test ./... -race -count=1
go build ./...
golangci-lint run ./...
npm ci
npm test
npm run test:i18n
npm run lint
openspec validate audience-session-count --strict
```

Manual: `go run ./cmd/comm-relay-server -config ./var/data/config.json -web ./web` (or `-addr` if 17877 is taken). Seed viewers with chat across sessions if the local DB is empty; otherwise use existing `var/data` viewers plus New stream.

## Evidence and Explicit Skips

Required: API JSON snippet or test log; Audience table screenshot (desktop); card screenshot; period-switch screenshot or note; overlay transparent smoke. Skip OBS and packaged desktop. Signing/tray/notifications skipped.
