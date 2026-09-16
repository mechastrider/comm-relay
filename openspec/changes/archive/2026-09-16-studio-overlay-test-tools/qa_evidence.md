# QA Evidence — studio-overlay-test-tools

Recorded in Cloud Agent (Linux amd64) on 2026-09-16. Gates **5.3**, **5.5**, and **5.6** with Studio test-mode UI explicitly **out of scope** ([OQ-002](../../docs/open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05)).

## Automated gates

| Command | Result |
|---------|--------|
| `go test -count=1 ./internal/api/... -run 'OverlayDebug\|Debug'` | passed |
| `go test -race -count=1 ./internal/api/...` (prior change gate 5.2) | passed in original delivery |
| `npm test` (includes overlay-debug helpers, surface contracts) | passed, 209 tests |
| `openspec validate studio-overlay-test-tools --strict` | passed before archive |

## P0 coverage without Studio panel

| qa_plan focus | Evidence |
|---------------|----------|
| Fail-closed `/ws` vs `/ws/overlay-debug` | `internal/api/overlay_debug_*_test.go`, hub tests |
| Typed fire/reset validation | handler boundary tests |
| Dedicated `/overlay/test/*` pages | `web/overlay/overlay-debug-surface-contract.test.js`, embed routes in `server.go` |
| Scenario catalog timing | unit tests for orchestration |
| Icon/preset/rectangle slices | npm tests from slices 3.x (prior gate 5.1) |

## Headless smoke

- `GET /overlay/test/chat` (and leaderboard/alert) return 200 when server runs with `-web ./web` (same pattern as recap smoke).
- `POST /api/overlay-debug/session/reset` with empty body returns 200 and `delivered_clients` (zero when no debug WS).

## Explicit skips

- **Studio test flow** rows in qa_plan (Enter test mode, Run/Replay from panel): panel markup absent by product decision; blocked on OQ-002.
- **Windows OBS CEF matrix** and packaged-app clipboard denial: release-environment checks.
- **Global multi-tab Studio** contention: API/global channel covered by Go tests; multi-tab Studio deferred with panel.

## 5.6 — URLs and rollback

- Stable test URL builders covered by `web/admin/js/overlay-debug-helpers.test.js` and `overlay-debug-panel.test.js` (helpers used by deferred panel and docs).
- Older builds without debug routes return 404 on `/overlay/test/*` and unknown API paths — standard static/API behavior; no migration involved.
