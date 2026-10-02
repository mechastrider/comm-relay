# QA Plan

## Platform Matrix
Chromium, Firefox, WebKit functional projects. Chromium visual baselines on one fixed environment. RU/EN; 1920x1080, 1280x800, 1024x768, 800x600, 390x844. Native Wails only where available; browser WebKit is not native evidence.

## Behavior and UI Scenarios
| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|---|---|---|---|
| admin navigation | Every route/tab, legacy URL, Back/Forward, reload, invalid route, dirty navigation | Correct view and preserved/confirmed draft | P0 |
| Settings | Save/reset/cancel each section, invalid fields, duplicate submit, concurrent refresh | Owned fields persist; unrelated edits preserved | P0 |
| Audience | Search/sort/page, viewer detail/merge/portrait/ranking, award/history, all catalog CRUD and media | Existing workflows and errors preserved | P0 |
| Studio | Four surfaces, all appearance fields, presets, preview, Publish/activate, OBS onboarding/URLs; dedicated test routes/API (OQ-002 keeps Studio test controls absent) | Preview isolation and correct persistence timing | P0 |
| Live | History/live messages, deletion/rewards/outcomes/countdown, leaderboard/stats/contracts/new stream | No duplicate or missing updates | P0 |
| recap | Capture/show/history/session/all-time/export | Correct durable history and opaque 1920x1080 PNG | P0 |
| recovery | HTTP 4xx/5xx, latency, stale response, WS loss/reconnect, storage unavailable | Scoped errors and successful retry without draft loss | P0 |
| accessibility | Tab/Shift+Tab, Escape, focus return, labels, tooltips, short-window dialogs | Reachable controls without clipping | P0 |
| visual parity | Before/after screenshots with fixed data and dynamic masking | Reviewed differences only | P1 |
| safety | Hostile text and unsafe media URLs | Text is not executed | P0 |
| surface integration | dock/chat/leaderboard/alerts/recap alongside admin | Transparency, limits, publication, activation and test isolation preserved | P0 |
| lifecycle | Sustained messages and repeated navigation | Bounded message list, one WS, cleaned timers/listeners | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios
Browser download and mocked native success/cancel/error are separate tests. Native packaged launch/save only where available. OAuth and external services use deterministic fixtures; no real authorization or posting.

## Persistence Migration / Corruption / Recovery
No schema migration. Test existing preferences and saved settings after reload and restart. Use disposable config/database/media with connectors disabled. Do not sync user data.

## Install / Upgrade / Downgrade / Packaged-App Smoke
Main E2E runs the real Go binary with embedded production assets. Separately smoke Vite proxy and disk assets. Check missing-build diagnostics. Preserve data compatibility; no install changes.

## Automated Commands / Manual Setup / Fixtures
Before replacement, establish current Node baseline and Playwright characterization. Root commands: npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; npm run test:e2e:visual. After frontend build: go build ./...; go test ./... -race -count=1; golangci-lint run ./.... Use real API for CRUD and server event delivery; route mocks only for faults/external inputs. Each independent case has isolated synthetic state. No production test endpoints.

## Evidence and Explicit Skips
Retain HTML report, failure screenshots, traces, visual diffs, and command outcomes. Classify real integration, mocked boundaries, and unavailable native/platform checks separately. Baseline: npm test passed 64/64 on 2026-10-02 during planning. No migration completion claim until feature inventory is covered and regressions are resolved. Never mass-accept changed screenshots to make tests green.
