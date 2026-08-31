# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 11 Chromium (admin) | amd64 | 1440×900, 1100×700, 390×844; 100% and 200% zoom; mouse and keyboard | yes, implementation QA |
| Windows 11 Wails/WebView2 | amd64 | Compact height ~700px, clipboard | yes, release smoke |
| Linux Chromium | amd64 | Same viewports, reduced motion | yes, implementation QA |
| macOS Wails/WebKit | universal 64-bit | Keyboard, clipboard fallback | yes, release smoke |
| OBS Browser Source | release | Transparent chat/leaderboard/alert; pinned and unpinned URLs | yes, program-output smoke |

Dark/light admin rows only if the product exposes them. Overlay theme cards are overlay looks, not admin theme variants.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| admin-and-dock / single surface | Select chat, then leaderboard, then alerts | Preview, inspector fields, and primary copy all follow that surface; no leftover independent tab strip | P0 |
| admin-and-dock / dock not themed | Open surface list; open Add to OBS dock | Dock is absent from the themed list; dock URL and Custom Browser Dock help appear in the sheet; no theme controls on dock | P0 |
| admin-and-dock / first visit | Clear site data; open `#studio` | Add to OBS auto-opens with chat copy + Browser Source steps | P0 |
| admin-and-dock / dismiss | Dismiss sheet; reload Studio; reopen Add to OBS | No auto-open; sheet still has all URLs | P0 |
| admin-and-dock / layers | Open Studio on a single-look config | Theme, font, duration visible; panel image and max-messages behind Advanced and still work | P0 |
| admin-and-dock / duration | Set 8s, 20s, until replaced; Publish | `message_ttl_seconds` is 8, 20, 0 | P0 |
| admin-and-dock / custom TTL | Load a preset with TTL 15; open Studio | Value not rewritten; editable in Advanced | P0 |
| admin-and-dock / one period | Change leaderboard period | One control; Follow-active and pinned URLs update | P0 |
| admin-and-dock / Live activate | Change active preset on Live | Immediate `POST /api/overlay/activate`; Studio toolbar has no duplicate hot select | P0 |
| admin-and-dock / Use on stream | Duplicate a look, edit it, Use on stream | Activate without Publish; on-air overlay follows the look after success | P0 |
| admin-and-dock / draft | Edit theme, do not Publish, watch live overlay | Live overlay unchanged; dirty status; leave-workspace confirm | P0 |
| obs-overlay / copy | Primary copy on chat; pinned from overflow | Unpinned omits `preset`; pinned includes it | P0 |
| obs-overlay / alert copy | Alerts surface or Add to OBS alerts | `/overlay/alert` Follow-active copy works | P0 |
| admin-design-system / wide | 1440×900 Studio | Preview is the widest pane; Replay and copy visible | P0 |
| admin-design-system / short | ~700px tall Studio, open Advanced | Inspector scrolls; heading and Publish stay reachable | P0 |
| admin-design-system / keyboard | Tab through surfaces, theme cards, Advanced, Add to OBS, Escape | Visible focus, names, Escape closes sheet to opener | P0 |
| admin-design-system / selected surface | Select each surface in expanded and collapsed wide layouts | Background plus edge/icon/type cue identify selection; accessible pressed state matches | P0 |
| admin-design-system / adaptive rail | Collapse rail, reload, then resize below and above 1024px | Wide collapse restores; compact remains a horizontal labeled selector | P0 |
| admin-and-dock / density mode | Make an edit, switch Essentials → All settings → Essentials, reload | Draft and surface remain; local mode restores; switch performs no network mutation | P0 |
| admin-and-dock / setup outcomes | Clear storage; test Close, Escape, Later, Done, and reopen | Only unseen auto-opens; seen/skipped reminder persists; Done hides reminder; persistent action reopens | P0 |
| admin-and-dock / dirty activation | Edit a non-active look without publishing | Use on stream is disabled and explains Publish; after successful Publish it becomes available | P0 |
| admin-and-dock / alert context | Select Alerts in Essentials | Shared theme remains editable and a localized explanation replaces irrelevant surface fields | P1 |
| admin-design-system / preview recovery | Block preview load, wait for timeout, choose Retry | Failed state appears outside iframe; retry keeps surface and draft query | P0 |
| admin-design-system / compact actions | Scroll a 390×844 and short-height Studio to the last field | Sticky dirty/use/publish actions remain reachable and cover no content | P0 |
| ui_contract / no dialog transplant | Inspect Studio DOM | Workspace does not depend on moving `#overlay-dialog` panels | P1 |
| localization | RU/EN Studio | New strings present; `npm run test:i18n` green | P1 |
| reduced motion / zoom | Reduced motion + 200% | State without animation; no overlap | P1 |
| clipboard denied | Deny clipboard; copy | URL selectable; failure reported; no success toast | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Confirm no new files under the config directory after Studio use besides existing overlay assets if an image is uploaded.
- Deny clipboard; no native permission loop.
- Restart the server with Studio dirty: confirm still warns; after discard, baseline matches server.
- Two admin windows: activate in Live A, Publish unrelated appearance in B using compose-from-latest.

## Persistence Migration / Corruption / Recovery

No Goose/`config.json` schema change. Skip database migration tests.

- Invalid `commRelay.studio.addToObsDismissed` → sheet auto-opens.
- Invalid preview surface key → chat.
- Downgrade smoke: previous admin loads same `config.json`.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Packaged or embedded `web/` (not a mismatched repo tree):

1. Open Studio, complete Add to OBS copy, Publish one appearance edit, activate from Live.
2. Open copied overlay/leaderboard/alert/dock URLs.
3. Replace with previous release; overlay URLs and config still work.

## Automated Commands / Manual Setup / Fixtures

```bash
go test ./...
go test ./... -race
golangci-lint run ./...
npm ci
npm run lint
npm test
npm run test:i18n
go build ./...
```

Manual: Chromium against `go run ./cmd/comm-relay-server` with a temp config that has one preset and another with two presets plus TTL 15. Helper unit tests for surface selection, duration mapping, and dismissed-preference parsing.

## Evidence and Explicit Skips

- Screenshots: 1440, 1100, 390, short height, Add to OBS open, Advanced open, each surface preview.
- Skip OBS WebSocket/scene visibility (non-goal).
- Skip installer/signing.
- Skip `-race` only if the environment cannot run it; record the skip. Frontend-only change should still run Go tests for regressions.

### Refinement evidence — 2026-08-31

- Playwright Chromium smoke at 1440×900 (expanded Essentials), 1100×700 (collapsed All settings), and 390×844 (Essentials and All settings). The compact run verified the fixed publication bar above bottom navigation and the horizontal labeled surface selector.
- First-visit run with empty storage verified the OBS setup dialog opens; its close, Later, and Done state transitions are covered by helper tests and distinct markup actions.
- Local server smoke returned `200` for `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, and `/dock/messages`; no program-output assets changed.
- Packaged Wails/WebView and OBS-host screenshots are release-smoke work and were not available in this Linux agent environment.
