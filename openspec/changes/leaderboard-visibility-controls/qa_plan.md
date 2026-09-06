# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows supported release target | Packaged architectures | OBS dock/Browser Source CEF, Wails, keyboard, 100%/200% zoom | yes, P0 |
| macOS supported release target | Packaged architectures | Local admin plus OBS when available | release smoke, P1 |
| Linux supported release target | Packaged architectures | Local admin plus supported OBS package | release smoke, P1 |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| Policy startup | Start fresh config and legacy config under each policy | Fresh install is automatic/hidden; legacy omission remains always-visible; on-request starts hidden | P0 |
| Authoritative timing | Connect two boards and dock, show for 5 seconds, reconnect one client, let expire under every policy | All use one absolute deadline and receive the same policy baseline: hidden outside Always, pinned in Always | P0 |
| Manual override | Show, extend, pin, hide, and resume under every policy and during cooldown | Always-hide persists until resumed; other hides clear pin/show and only gate automatic triggers through cooldown; pin survives triggers but not restart | P0 |
| Automatic triggers | Award with duration, leader change, ordered top-three membership change, lower-rank XP, message-only update | Eligible events trigger/extend correctly; dirty interval is fallback; messages do not dirty | P0 |
| Command action | Create `show_leaderboard`, exercise case/whitespace, extra words, per-viewer cooldown, and visibility cooldown | Exactly one timed request and command event occur on a match; no alert frame is emitted | P0 |
| API and WS contracts | Call read/action routes with valid, invalid, malformed, and unavailable-controller inputs; connect production/debug WS | Status/errors are UI-safe; only production receives the dedicated snapshot/frame; leaderboard data stays unchanged | P0 |
| Dock toolbar | Switch among policies and operate at 300px and 200% zoom with long EN/RU labels and an active scrolling message list | Always shows one labelled switch; other policies show timed Show, Pin toggle, and Hide with no Auto button; pinned disables Show but not Hide; toolbar stays pinned/keyboard usable and failures keep last state | P0 |
| Accessibility/motion | Keyboard through settings/editor/dock; inspect names, focus, live region; enable reduced motion | No color-only state, countdown does not announce each tick, and board transitions respect reduced motion | P0 |
| Suspend/reconnect | Suspend past a deadline or simulate clock advance, then reconnect | Expired state resolves hidden; UI recomputes from server snapshot | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Exercise controller cancellation with timed state, dirty interval, and delayed award pending; shutdown MUST be prompt and leak-free.
- Stress bounded submissions from concurrent HTTP, award, XP, and command paths; use the race detector and verify no unbounded timer/goroutine growth.
- No native IPC, dialogs, notifications, tray/menu, global shortcut, or OBS control permission applies. Loopback HTTP/WebSocket remains the only UI boundary.

## Persistence Migration / Corruption / Recovery

- Upgrade a version-12 fixture through migration 00013 and verify every existing command becomes `alert`; round-trip both actions through store/API.
- Run 00013 down/up against a scratch database and verify command rows and existing presentation fields survive.
- Verify fresh-config automatic defaults and legacy-config absent-object `always` fallback, plus invalid policy/timing updates that leave disk and runtime unchanged.
- Inject an unknown command action and a migration failure fixture; verify validation/startup fails through the existing recovery path without partial state.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Package/start the desktop app with a copied legacy config/database; confirm migration, always-visible compatibility, settings save, and dock control.
- Restart while timed, pinned, and manually hidden; confirm ephemeral overrides clear and configured policy wins.
- Smoke downgrade only against copied data: the old binary ignores additive config/column; document that `show_leaderboard` actions are unavailable, not converted into working alerts.
- Signing, notarization, installer layout, update channel, and uninstall behavior are unchanged and use existing release checks.

## Automated Commands / Manual Setup / Fixtures

- Automated: targeted controller/timer, config, migration/store, handler, WebSocket, command matcher/event, and frontend tests; `go test ./...`; `go test -race ./...`; `golangci-lint run ./...`; `npm ci`; `npm run lint`; repository localization test.
- Prefer a fake clock/controller harness for deterministic deadlines, delayed awards, cooldown, dirty interval, shutdown, and reconnect snapshots.
- Fixtures: version-12 database with alert commands, fresh/legacy/invalid configs, XP sequences that alter leader/top-three/lower ranks, award durations, two production WS clients plus debug client.
- Manual: local server, two leaderboard tabs, OBS message dock, Studio/admin settings, and a chat source capable of sending the configured command.

## Evidence and Explicit Skips

Attach command/race output, migration fixture results, API/WS payload captures, and Windows OBS screenshots for hidden/timed/pinned plus narrow-dock states. Record versions and any unavailable macOS/Linux OBS matrix cells. Remote access, OBS source-eye automation, connector authentication, signing, publishing, and alert-backlog coordination beyond the triggering alert's own delay are explicit skips.

## Execution Evidence — 2026-09-06

- Environment: Linux 5.15 x86_64, Go 1.26.3, Node 24.15.0, npm 11.12.1, and the repository-pinned golangci-lint 2.12.2.
- Automated coverage passed: `go test ./...`, `go test -race ./...`, `golangci-lint run ./...`, `npm test` (40 tests), `npm run lint`, and `npm run test:i18n`.
- Deterministic tests cover policy startup, deadlines and extension, cooldown/dirty fallback, manual precedence, suspend-style clock advance, delayed awards, shutdown, XP/top-three classification, message-only silence, command action/cooldown/event behavior, API errors, production/debug WebSocket isolation, and reconnect snapshots.
- Migration evidence passed from a version-12 fixture through 00013, including down/up preservation and the legacy `alert` default; unknown stored actions fail closed.
- Headless local smoke passed with a fresh config/database: migration 1→13, health, hidden automatic startup, timed manual show with an absolute deadline, dock/leaderboard URLs, clean shutdown, and hidden automatic state after restart.
- Not available in this environment: Windows/macOS packaged Wails and OBS CEF runs, real OBS source screenshots, 200% zoom visual inspection, and copied-data downgrade with an older binary. These cells remain manual release QA and keep Q.1 open.

## Follow-up Evidence — 2026-09-06 (policy-specific dock controls)

- Windows automated checks passed: targeted controller tests, the focused API test, `npm test` (144 tests), `npm run lint`, i18n parity, `git diff --check`, and strict OpenSpec validation.
- New deterministic coverage verifies Always switch actions, Automatic/On-request control presentation, Pin toggle behavior, absence of a standalone Auto/Resume control, non-Always Hide recovery, and Always timed-expiry baseline.
- The repository-wide Go run hit the existing Windows TempDir cleanup race in `TestAwardGrant_WhenJokeToExistingViewer_ExpectXPAndAlert`; its focused rerun passed. Race testing was unavailable because this Windows Go environment has CGO disabled. `golangci-lint` remains blocked by three pre-existing findings in `var/import-jake-pack/main.go`.
