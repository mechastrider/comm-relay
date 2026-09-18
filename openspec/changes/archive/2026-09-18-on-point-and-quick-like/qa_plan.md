# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP fixtures | yes — CI gate |
| Current Chromium-family browser | host | Live Messages ~1280×800; dock ~400×700 | yes — UI/P0 |
| `/dock/messages` | host | height-capped OBS dock | yes — P0 layout + Like |
| Live Messages | host | same reward control | yes — P0 |
| Overlay `/overlay` | host | transparent background | yes — P0 regression (no operator buttons) |
| OBS Browser Source | host when available | unchanged | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| operator-rewards / fresh seed | New DB, `ru-RU` | `on_point` named В точку, 20 XP, ping, 5000 ms | P0 |
| operator-rewards / upgrade insert | Existing DB without `on_point` | Row inserted once; other awards unchanged | P0 |
| operator-rewards / keep custom | Existing DB with custom `on_point` | Name/points unchanged | P0 |
| operator-rewards / delete stays gone | Delete `on_point`, restart | Not recreated | P0 |
| operator-rewards / grant any line | Grant On Point from a non-command row | XP +20, alert, quote when message id present | P0 |
| viewer-progression / Sync seed | New or upgraded DB | `achievement_on_point` Синхрон / In Sync, target 10 | P0 |
| viewer-progression / tenth grant | Ten `on_point` grants | Unlock once; no extra XP from the achievement | P0 |
| viewer-progression / alerts off | Default settings | Unlock stored; no production progression splash | P1 |
| admin-and-dock / Like icon | Dock row with `user_id`, `like` exists | Thumbs-up; one click grants `like` | P0 |
| admin-and-dock / picker omits like | Open Reward | `like` absent; `on_point` listed | P0 |
| admin-and-dock / like deleted | Delete Streamer Like award | Icon gone; picker of remaining types | P0 |
| admin-and-dock / no identity | Row without `user_id` | No Like, no Reward | P0 |
| admin-and-dock / no wrap | Grant Like then On Point on dock | Action buttons stay on the username line | P0 |
| admin-and-dock / Live parity | Repeat Like + grant on Live | Same controls and no wrap | P0 |
| admin-and-dock / a11y | Tab and screen-reader name | Like has aria-label; live success region | P1 |
| overlay regression | Grant On Point while overlay loaded | Transparent page; highlight if row visible | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new files outside `comm-relay.db`.
- Process restart: seeds persist; deleted seeds stay gone.
- Two dock/admin tabs: grant on one; the other sees XP/alert via `/ws`.

## Persistence Migration / Corruption / Recovery

- No Goose schema. Marker `on_point_catalog_initialized` completes after insert.
- Interrupted pending locale: next open finishes insert in that locale.
- Failed transaction: startup error; no half-written marker.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./...`. Rollback: previous binary; catalog rows inert extras.

## Automated Commands / Manual Setup / Fixtures

```bash
go build ./...
go test ./...
go test ./internal/store ./internal/api -race
golangci-lint run ./...
npm ci
npm run lint
```

Node tests for `web/shared/reward-picker.js` (picker omits `like`, Like control, feedback not wrapping). Store tests for bootstrap cases. Manual: `task web:dev` or `go run ./cmd/comm-relay-server`, open `/dock/messages` and Live, grant on a real or injected line.

## Evidence and Explicit Skips

- Record CI command output and a dock screenshot or note that actions did not wrap after grant.
- Skip OBS packaging, signing, and Stream Deck.
- Skip auto-grant / situation-window scenarios (out of scope).
