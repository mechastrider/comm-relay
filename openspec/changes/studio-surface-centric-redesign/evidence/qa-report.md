# QA Evidence Report

## Metadata

| Field | Value |
|-------|-------|
| Change / schema | `studio-surface-centric-redesign` / `desktop-change` |
| Run date/time and timezone | 2026-08-30, UTC |
| Executor | Cursor Cloud Agent (Linux Chromium + Node/Go checks) |
| Result | Partial |

## Environment and Matrix Coverage

| Runtime / OS / device / variant | Planned | Executed | Result |
|---------------------------------|---------|----------|--------|
| Linux Chromium 1440×900 / ~1100 / 390×844 | yes | yes | Pass |
| Linux Chromium short height (~700px) + Advanced | yes | yes | Pass |
| Linux Chromium 200% zoom | yes | no | Skip (P1) |
| Linux Chromium reduced motion | yes | no | Skip (P1) |
| Windows 11 Chromium | yes | no | Skip (release smoke) |
| Windows 11 Wails/WebView2 | yes | no | Skip (release smoke) |
| macOS Wails/WebKit | yes | no | Skip (release smoke) |
| OBS Browser Source program output | yes | no | Skip (no OBS in this VM); `/overlay` smoke in Chromium only |
| RU/EN catalogs | yes | `npm run test:i18n` (569 keys) | Pass |

## Checks

| Plan/spec/contract ref | Command or scenario | Expected | Actual | Evidence |
|------------------------|---------------------|----------|--------|----------|
| 7.1 | `npm run lint && npm test && npm run test:i18n` | green | 23 tests, ESLint 0, 569 i18n keys | session log |
| 7.2 | `go test ./...`, `-race`, `golangci-lint run ./...` | green | all pass, 0 issues | session log |
| D.1 | `web/embed.go` `//go:embed admin …`; `openspec validate --strict` | packaged admin includes new JS; change valid | valid | `web/embed.go`, OpenSpec CLI |
| admin-and-dock / first visit | Clear storage; open `#studio` | Add to OBS auto-opens | Pass (screenshot); compact demo later used dismissed preference | `studio_add_to_obs_first_visit.png` |
| admin-and-dock / single surface | Chat → leaderboard → alerts | Preview, inspector, Follow-active follow selection; dock not in list | Pass | `studio_chat_essential.png`, `studio_leaderboard.png`, `studio_alerts.png`; demo 00:19–00:22 |
| admin-and-dock / dock not themed | Surface list + Add to OBS dock tab | Dock absent from list; dock URL + Custom Browser Dock in sheet | Pass | `studio_add_to_obs_dock.png`; demo 00:23–00:29 |
| admin-and-dock / layers | Single-look Studio | Theme, font, duration first; Advanced holds rest | Pass | `studio_advanced.png`; demo 00:46–01:00 |
| admin-and-dock / Live activate | Live hot Active preset; Studio has none | Live keeps `#live-active-preset`; Studio toolbar has no duplicate | Pass | `live_active_preset.png`; demo 01:14–01:17 |
| admin-design-system / wide | 1440 Studio | Preview widest; Replay + copy visible | Pass | `studio_wide_1440.png` |
| admin-design-system / narrow | 390 Studio | Stacked; no horizontal page scroll | Pass | `studio_narrow_390.png` |
| obs-overlay / copy + overflow | Overflow size/backdrop/pinned | Replay + Follow-active stay on chrome | Pass | `studio_preview_overflow.png`; demo 00:29–00:37 |
| obs-overlay / overlay smoke | Open `/overlay` | Transparent overlay page loads | Pass (Chromium, not OBS CEF) | `overlay_chat.png`; demo 00:00–00:08 |
| review tail | Switch look without edits | Studio not dirty | Unit: `studio-helpers.test.js` | `overlayDraftIsDirty` ignores `active_preset_id` |
| ui_contract / no dialog transplant | Studio DOM | Workspace owns markup; leftover `#overlay-dialog` not transplanted | Pass (code + P1 inspect) | `web/admin/js/studio.js` has no `appendChild` of dialog |

## P0 / P1 and Gaps

| ID | Severity | Finding/gap | Status | Follow-up |
|----|----------|-------------|--------|-----------|
| P1-zoom | P1 | 200% zoom not run | Skip | Release / local Windows QA |
| P1-motion | P1 | `prefers-reduced-motion` not run | Skip | Release QA |
| P1-obs | P1 | OBS CEF / Wails / macOS clipboard not run | Skip | Packaged-app smoke in `qa_plan.md` |
| demo-auto-open | P0 (video) | Compact demo did not auto-open Add to OBS (preference already dismissed) | Covered by first-visit screenshot | Re-clear `commRelay.studio.addToObsDismissed` for a first-run recording |

## Processes and External Actions

- Dev server: `go run ./cmd/comm-relay-server -web ./web` on `127.0.0.1:17877` (left running).
- No installer, signing, store submit, or OBS WebSocket scene checks.
