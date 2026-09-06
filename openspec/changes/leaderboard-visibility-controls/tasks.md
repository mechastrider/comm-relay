# Implementation Slices

## Slice: `Own one authoritative visibility state`

> **Outcome**: One cancellable runtime controller applies global policy, deadlines, cooldown, dirty state, manual precedence, and reconnect-safe snapshots.
> **Acceptance**: `go test -race ./internal/leaderboard/... ./internal/bootstrap/...`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `runnable-background-processes`, `golang-tests`
> **Scope**: new internal visibility package, config, bus events, bootstrap wiring
> **Allowed fallout**: fake clock, typed commands/events, focused config/bootstrap tests
> **Blocked**: OBS scene control, persistence of runtime overrides, remote access

- [x] 1.1 Add presence-aware global visibility config, validation, public DTO fields, fresh automatic defaults, and legacy always-visible fallback.
- [x] 1.2 Implement the single-owner controller with bounded input, one reusable timer, absolute deadlines, manual show/hide/pin/resume, and policy re-evaluation.
- [x] 1.3 Add deterministic fake-clock tests for startup, extension/expiry, cooldown, dirty interval, pin precedence, resume, suspend-style clock advance, and cancellation.
- [x] 1.4 Register the controller as a cancellable runnable and expose typed snapshot/transition events without blocking shutdown or producers.

## Slice: `Trigger only on meaningful activity`

> **Outcome**: Automatic mode shows after an award, a leader/top-three membership change, or a dirty interval, while message-only churn remains silent.
> **Acceptance**: `go test -race ./internal/api/... ./internal/store/... ./internal/leaderboard/...`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `golang-tests`
> **Scope**: award grant pipeline, XP mutation/ranking comparison, controller submissions
> **Allowed fallout**: rank snapshot helpers, award-delay fixtures, interaction tests
> **Blocked**: XP formula/order changes, exact alert-backlog coordination, message-count triggers

- [x] 2.1 Emit an award visibility request after that award's configured duration and cancel pending delay on shutdown.
- [x] 2.2 Compare XP mutation results to detect leader or ordered top-three membership changes and mark other XP changes dirty.
- [x] 2.3 Prove message-count-only updates do not trigger or dirty, eligible timed triggers extend from newest event, and pinned state ignores triggers.

## Slice: `Expose compatible localhost state and actions`

> **Outcome**: Production clients can read/control visibility and stay synchronized over a dedicated WebSocket frame without coupling it to ranking data.
> **Acceptance**: `go test ./internal/api/...` including router-guard and WebSocket queue scenarios
> **Skills**: `api-conventions`, `backend-structure`, `golang-errors`, `golang-tests`
> **Scope**: leaderboard visibility handlers/routes, production WS hub, leaderboard client
> **Allowed fallout**: handler DTOs, hub snapshot provider, browser transition styles/tests
> **Blocked**: REST-style mutations, debug-feed leakage, changing leaderboard snapshot fields

- [x] 3.1 Add `GET /api/leaderboard/visibility` and the four POST-action routes with bounded JSON input and UI-safe errors.
- [x] 3.2 Broadcast/snapshot `leaderboard_visibility` through the normal bounded production client queue while excluding overlay-debug clients.
- [x] 3.3 Make `/overlay/leaderboard` follow hidden/timed/pinned frames with transparent-page and reduced-motion behavior; keep preview/debug pages independent.
- [x] 3.4 Add handler, router-guard, multi-client reconnect, old-client-ignore, debug-isolation, and controller-unavailable tests.

## Slice: `Let viewer commands request the board`

> **Outcome**: An operator-defined command can show the board without a splash while existing commands remain alerts and analytics/cooldowns stay consistent.
> **Acceptance**: `go test ./internal/store/... ./internal/command/... ./internal/api/...`
> **Skills**: `database-migrations`, `comm-relay-backend-golang`, `api-conventions`, `golang-tests`
> **Scope**: migration 00013, command model/store/API/matcher, command event logging
> **Allowed fallout**: migration fixtures, API DTOs, catalog tests
> **Blocked**: seeded `!leaderboard`, command parameters, score changes, editing migrations 00001–00012

- [x] 4.1 Add reversible migration `00013_commands_action.sql` with non-null default `alert` and version-12 up/down fixtures.
- [x] 4.2 Thread validated `alert|show_leaderboard` action through command store, public API, create/update compatibility, and starter rows.
- [x] 4.3 Dispatch exact enabled command matches to alert or timed visibility while preserving message counting, per-viewer cooldown, no XP, and one interaction event.
- [x] 4.4 Cover existing alerts, show-without-alert, whitespace/case, disabled/unknown/parameterized lines, both cooldowns, and no auto-seed.

## Slice: `Operate policy, commands, and on-air state from the UI`

> **Outcome**: Settings configure global behavior, Audience edits command action, and the OBS message dock gives compact authoritative controls plus active-look selection.
> **Acceptance**: `npm test` plus keyboard, narrow-dock, 200% zoom, reconnect, and failure smoke from `qa_plan.md`
> **Skills**: `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`, `obs-overlay-themes`
> **Scope**: admin settings/command catalog, `/dock/messages`, shared i18n/API helpers
> **Allowed fallout**: dock DOM/CSS split, pure countdown/state helpers, frontend tests
> **Blocked**: themed operator chrome, global Studio Publish coupling, alert queue inspector

- [x] 5.1 Add the global policy/timing/trigger Settings section with conditional help, retained disabled values, field errors, and immediate runtime update after Save.
- [x] 5.2 Add Alert/Show leaderboard action editing and catalog distinction while requiring/sending only fields relevant to the selected action.
- [x] 5.3 Restructure the dock into pinned toolbar plus independently scrolling messages; add state/countdown, Show, Pin/Resume, Hide, and active-preset controls.
- [x] 5.4 Implement initial GET plus WS recovery, per-action busy/error behavior, authoritative countdown reconciliation, and message-scroll preservation.
- [x] 5.5 Add EN/RU copy and tests for settings serialization, action forms, 300px markup/layout contract, accessible names/tooltips, live-region transitions, and i18n parity.

## Slice: `Document and release visibility control`

> **Outcome**: Streamers understand the three policies, trigger/cooldown defaults, dock controls, command action, upgrade behavior, and the boundary from OBS source-eye state.
> **Acceptance**: Documentation URLs/commands smoke-tested; one concise Russian `[Unreleased]` entry exists
> **Skills**: `changelog`, `comm-relay`
> **Scope**: `docs/concept.md`, `README.md`, `README.en.md`, `CHANGELOG.md`
> **Allowed fallout**: troubleshooting and upgrade/rollback notes
> **Blocked**: roadmap commitments for alert queues, release versioning, publishing

- [x] 6.1 Update the product concept and Russian/English operator documentation with policy semantics, defaults, command setup, localhost controls, and compatibility notes.
- [x] 6.2 Add a concise Russian `[Unreleased]` bullet without changing released sections.

## Gate: verification

- [x] V.1 Run `gofmt` and `goimports` on touched Go files.
- [x] V.2 Run `go test ./...` and `go test -race ./...`.
- [x] V.3 Run `golangci-lint run ./...`.
- [x] V.4 Run `npm ci`, `npm test`, `npm run lint`, and `npm run test:i18n`.
- [x] V.5 Run `openspec validate leaderboard-visibility-controls --strict` and confirm implementation matches every delta and contract.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record platform coverage, timer/race/migration evidence, API/WS captures, and narrow-dock screenshots.

## Gate: review

- [x] R.1 Obtain a fresh diff review; resolve every CRITICAL finding and rerun affected checks.

## Gate: distribution-readiness

- [ ] D.1 Smoke packaged startup, migration-12 upgrade, copied-data downgrade, restart semantics, and current URLs without signing, notarizing, uploading, or publishing.
