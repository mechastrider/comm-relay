# Implementation Slices

## Slice: `Open and recover one durable viewer contract` (backend)

> **Outcome**: The operator can open one validated contract, read it after restart, and repeat its on-stream announcement without duplicate active state.
> **Acceptance**: `go test ./internal/store ./internal/api`; API smoke for current/open/announce; migration 14→15 and restart fixture pass.
> **Skills**: `comm-relay`, `backend-structure`, `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-logging`, `golang-tests`, `database-migrations`
> **Scope**: `internal/store`, migration 15, `internal/api`, production WebSocket alert encoder/router
> **Allowed fallout**: store types/errors/test hooks, handler wiring, synthetic fixtures, router guards
> **Blocked**: multiple active contracts, templates/history UI, connector behavior, generic rules engine, config migration

- [x] 1.1 Add migration 15 and contract/store models with reward snapshot fields, lifecycle checks, nullable interaction-event `contract_id`, and the SQLite-enforced one-active slot.
- [x] 1.2 Implement store operations to open, load current, and validate/reload an active contract for repeat announcement, with trimmed Unicode code-point limits and typed not-found/conflict errors.
- [x] 1.3 Add `GET /api/viewer-contracts/current` and POST actions `/open` and `/announce` with snake_case payloads, 400/409/500 mapping, post-commit contract alert encoding, and redacted lifecycle logs.
- [x] 1.4 Cover fresh/14→15/down-up/older-writer migrations, snapshot survival after catalog edit/delete, one-active races, restart reads, stale repeat, public JSON shape, route methods, and no automatic WebSocket replay.

## Slice: `Settle the contract through the existing reward system` (backend)

> **Outcome**: The operator can award one canonical viewer exactly once or close without a result; XP, events, journal, alerts, and leaderboards stay consistent.
> **Acceptance**: `go test -race -count=1 ./internal/store ./internal/api`; synthetic Twitch/YouTube/VK/merged winner and rollback scenarios pass.
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-logging`, `comm-relay-observability`, `golang-tests`
> **Scope**: contract settlement transaction, interaction events, reward-history compatibility, award/leaderboard publication, lifecycle handlers
> **Allowed fallout**: refactor existing award transaction helpers, rank-change result, test failure injection, wire-frame tests
> **Blocked**: new currency/reward kind, viewer auto-creation from platform ids, contract history response, automatic winner detection

- [x] 2.1 Implement one atomic winner transaction keyed by visible canonical `viewer_id`: validate active id, update all/session/day XP, append one kind=`award` event with contract provenance, mark awarded, and expose rank/portrait data for normal post-commit publication.
- [x] 2.2 Implement atomic no-result close and POST `/api/viewer-contracts/award` and `/close`, including 404 viewer handling, 409 stale/racing transitions, confirmations' response data, normal award alert/leaderboard visibility hooks, and no frames before commit.
- [x] 2.3 Preserve the existing reward-history response and journal behavior for contract awards while proving no-result close and failures add no history; keep title/objective out of interaction events, responses, and Info logs.
- [x] 2.4 Add race/idempotency, hidden/merged/multi-platform viewer, catalog-deleted snapshot, exact XP, event provenance, history privacy, rank refresh, WebSocket drop accounting, and injected rollback tests.

## Slice: `Operate contracts from Live` (frontend)

> **Outcome**: The localized Live tab supports draft/open/repeat/winner/no-result flows with deliberate confirmation, reliable recovery, and accessible responsive behavior.
> **Acceptance**: `npm run lint && npm test`; keyboard-only browser smoke in EN/RU at narrow width and ~700 px height/150% scaling.
> **Skills**: `web-static-frontend`, `api-conventions`, `ux-form-practices`, `web-constrained-layout`, `comm-relay`
> **Scope**: `web/admin` markup/styles/modules/DOM registry, Live tab lifecycle, viewer/reward API composition, locale catalogs
> **Allowed fallout**: reusable pure helpers, abort controllers, existing dialog primitives, test fixtures and package test list
> **Blocked**: dock controls, contract catalog/history, persistent draft/localStorage, new framework, Studio settings

- [x] 3.1 Add the fourth Contracts tab/panel and modular state loader with empty/loading/error/offline/conflict recovery, abort/late-response protection, current contract display, and reward catalog empty guidance.
- [x] 3.2 Implement labeled title/objective/reward inputs, 80/280 Unicode validation, in-flight gating, associated field errors, draft preservation, Announce and Announce again actions, and EN/RU copy/parity.
- [x] 3.3 Implement the capped searchable canonical-viewer picker plus separate award/no-result confirmations, duplicate-name platform distinction, keyboard/focus restoration, 404/409 reconciliation, and success focus/state behavior.
- [ ] 3.4 Add pure helper, markup, interaction, i18n, accessibility-state, stale-response, and dock-ignore tests; smoke responsive stacking, pinned dialog actions, visible scrolling, and no horizontal clipping.

## Slice: `Show contract announcements on the existing alert surface` (frontend)

> **Outcome**: Contract announcements render safely and readably in every current theme and receive award-protected queue treatment without changing known alert behavior.
> **Acceptance**: `npm run lint && npm test`; `/overlay/alert` visual/audio smoke for all themes and landscape/square/portrait/banner rectangles.
> **Skills**: `comm-relay`, `web-static-frontend`, `obs-overlay-themes`, `comm-relay-observability`
> **Scope**: `web/alert`, shared alert emblem/scheduler helpers, production alert frame compatibility
> **Allowed fallout**: sample fixtures, safe-media fallback tests, CSS theme selectors, reduced-motion rules
> **Blocked**: new Browser Source URL, new theme id, preemptive alerts, historical replay, chat/leaderboard presentation changes

- [x] 4.1 Extend the scheduler so `source=contract` shares the protected FIFO lane with awards, never preempts the visible splash, never expires, and follows documented capacity displacement; retain legacy unknown-source command behavior.
- [x] 4.2 Render a distinct contract variant from text nodes with title, objective, reward, +XP, snapshot media/presentation, stable emblem and broken-media fallback across every current theme.
- [ ] 4.3 Add scheduler/render/media/XSS/reduced-motion/unknown-client tests and a sample fixture; verify transparent root, wrapping/clamping, safe filenames, no empty chrome, audio policy, and OBS rectangle fit.

## Slice: `Document and prepare the user-visible experiment` (docs)

> **Outcome**: User-facing records describe the manual single-contract workflow and repository lifecycle status without overstating platform automation or release state.
> **Acceptance**: Changelog scope check, RU/EN link/copy review, OpenSpec validation, and interactive backlog/spec reconciliation at closeout.
> **Skills**: `changelog`, `interactive-research`, `openspec-sync-specs`, `openspec-archive-change`
> **Scope**: `[Unreleased]`, applicable RU/EN product usage text, `docs/interactive/backlog.md`, canonical OpenSpec synchronization after implementation
> **Allowed fallout**: concise support guidance and status/date links
> **Blocked**: roadmap promotion beyond the approved experiment, install-step churn, release versioning, announcement copy, publishing

- [x] 5.1 Add or refine one Russian `[Unreleased]` bullet for the visible manual contract workflow, preserving all released sections; update RU/EN usage docs only where they enumerate Live tabs or interactive features.
- [ ] 5.2 After behavior and QA are complete, reconcile `INT-017` with the implemented canonical specs, sync delta specs, and archive the change through the explicit OpenSpec closeout workflow; do not promote excluded predictions/rules/economy work.

## Gate: qa (verification)

- [ ] Q.1 Execute `qa_plan.md`; record platform/theme/scaling/input matrix coverage and synthetic evidence without real OAuth tokens or chat data.
- [ ] Q.2 Run `npm ci && npm run lint && npm test` and record results.
- [ ] Q.3 Run `go test ./...` and `go test -race -count=1 ./...` and record results.
- [ ] Q.4 Run `golangci-lint run ./...`, `go build ./...`, `openspec validate viewer-contracts-experiment --strict`, and `git diff --check` and record results.
- [ ] Q.5 Smoke the local server with a temporary data directory: `/health`, all five contract endpoints, WebSocket open/repeat/award behavior, restart recovery, reward Journal/leaderboard, and no-result close.
- [ ] Q.6 Smoke admin and `/overlay/alert` in both locales, keyboard-only flow, reduced motion, every existing theme, and required Browser Source rectangles; record any unavailable Windows/macOS/Linux packaged-app cell explicitly.

## Gate: review

- [ ] R.1 Perform a fresh independent diff review against every delta spec and contract artifact; CRITICAL=0, HIGH=0, no scope creep, no secrets/content in logs, and all affected checks green.
- [ ] R.2 Review migration/down/older-writer safety, concurrent settlement, alert queue compatibility, unknown-frame behavior, and changelog/versioned-heading preservation separately from the implementation author pass.

## Gate: distribution-readiness

- [ ] D.1 Validate that current Windows amd64, macOS universal, Linux amd64, and headless build definitions embed migration 15 and matching admin/alert assets without changing artifact names, signing policy, installer behavior, or minimum OS.
- [ ] D.2 Exercise upgrade and application/schema rollback on disposable version-14 data, preserve evidence/backups, and confirm support guidance for missed announcements; do not sign, notarize, upload, tag, or publish.
