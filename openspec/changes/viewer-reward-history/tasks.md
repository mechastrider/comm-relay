# Implementation Slices

## Slice: Durable and atomic award journal

> **Outcome**: Every successful manual award has an immutable, meaningful history row committed with its XP, including upgraded databases.
> **Acceptance**: `go test ./internal/store ./internal/api -count=1`
> **Skills**: `database-migrations`, `comm-relay-backend-golang`, `golang-errors`, `golang-logging`, `comm-relay-observability`, `golang-tests`
> **Scope**: `internal/store/migrations`, interaction-event storage, award grant transaction, award handler ordering
> **Allowed fallout**: store/API tests, test-only failure injection, diagnostics/log assertions
> **Blocked**: achievement/donation/streak events, XP policy changes, award history mutation

- [ ] 1.1 Add the next immutable Goose migration for nullable `reward_name`, catalog/id backfill, global/viewer history indexes, and a safe Down path; add version-13 upgrade plus Down/Up tests.
- [ ] 1.2 Extend interaction-event persistence and scanning with validated award-name snapshots while keeping command/activity rows compatible.
- [ ] 1.3 Refactor the HTTP award path to commit identity, all-time/session/day XP, rank calculation, and the award event in one store transaction before broadcasting.
- [ ] 1.4 Test grant-time name capture, rename/delete stability, restart durability, duplicate grants, message-reference privacy, and rollback when event insertion fails.
- [ ] 1.5 Preserve award logs, diagnostics counters, leaderboard visibility scheduling, and leaderboard publication after successful commit; verify no success signal occurs after rollback.

## Slice: Bounded reward-history read API

> **Outcome**: Local clients can traverse global or per-viewer award history safely and deterministically.
> **Acceptance**: `go test ./internal/store ./internal/api -count=1`
> **Skills**: `api-conventions`, `comm-relay-backend-golang`, `golang-errors`, `golang-logging`, `golang-tests`
> **Scope**: paginated store query, cursor codec, `GET /api/reward-history`, router registration
> **Allowed fallout**: query indexes, response DTOs, API/store fixtures and tests
> **Blocked**: offset pagination, REST id paths, WebSocket feed, search/export/aggregates

- [ ] 2.1 Implement an award-only keyset query ordered by `(created_at DESC, id DESC)`, with optional canonical viewer scope and `limit + 1` next-page detection.
- [ ] 2.2 Implement versioned opaque cursor encode/decode with bounded input, parameterized predicates, default limit 50, maximum 100, and typed invalid-input errors.
- [ ] 2.3 Add and register `GET /api/reward-history`, returning `entries` and optional `next_cursor` with exactly the snake_case fields in the delta spec.
- [ ] 2.4 Map unknown/hidden viewer scope to HTTP 404, invalid cursor/limit to 400, and unexpected store failures to logged UI-safe 500 responses.
- [ ] 2.5 Test global/viewer pages, equal timestamps, complete multi-page traversal, merge behavior, invalid inputs, legacy id fallback, and exclusion of commands, activity, platform ids, source-message fields, and chat text.

## Slice: Channel-wide Audience History

> **Outcome**: Operators can open a localized Audience tab and see who received which awards, with bounded refresh and pagination states.
> **Acceptance**: `npm test && npm run test:i18n && npm run lint`; manual History smoke at narrow and wide widths
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ui-styling`, `api-conventions`
> **Scope**: Audience tab markup/routing, history JS module, safe rendering, styles, RU/EN catalogs
> **Allowed fallout**: DOM registry, audience tab helpers/tests, shared loading/error components
> **Blocked**: editing/deleting history, filters/search/grouping, overlay/dock UI, framework adoption

- [ ] 3.1 Add the fourth Audience History tab and panel without changing the existing Viewers, Commands, or Awards workflows.
- [ ] 3.2 Build a focused history client/controller for first-page load, Refresh replacement, Load more append, duplicate-request guards, and superseded-response handling.
- [ ] 3.3 Render the semantic Time/Viewer/Reward/XP table using text nodes, localized date plus 24-hour time, signed points, and deterministic empty/error/pagination states.
- [ ] 3.4 Add responsive styles that keep panel scrolling bounded and controls reachable at 100–200% zoom in existing themes.
- [ ] 3.5 Add RU/EN copy and JS tests for tab wiring, safe hostile-text rendering, pagination retention after failure, accessible busy state, and i18n parity.

## Slice: Per-viewer reward history

> **Outcome**: The existing viewer inspector and compact sheet show complete paginated award history without blocking profile controls or leaking stale selections.
> **Acceptance**: `npm test && npm run lint`; manual wide-inspector and compact-sheet smoke
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ui-styling`, `api-conventions`
> **Scope**: `web/admin/js/viewers.js` or a focused helper module, viewer detail DOM/styles/locales/tests
> **Allowed fallout**: reusable history row renderer and request helper shared with the global tab
> **Blocked**: viewer profile redesign, merge behavior changes, achievements UI, source-message navigation

- [ ] 4.1 Add a Reward history section after existing viewer controls and load its first 10 entries independently from the profile request.
- [ ] 4.2 Add section-level loading, empty, retry, and Load more states that never replace or disable the rest of the viewer detail.
- [ ] 4.3 Cancel or generation-guard history requests on selection change, close, merge, and workspace teardown so late rows cannot render under another viewer.
- [ ] 4.4 Reuse safe row/time/points presentation where practical and verify compact-sheet header/body scrolling, focus return, and keyboard access.
- [ ] 4.5 Add focused tests for viewer scoping, stale responses, pagination, failure isolation, merge/reopen behavior, and long localized names.

## Slice: Documentation and delivery state

> **Outcome**: Streamers see an accurate release note and project planning/status remains consistent with shipped behavior.
> **Acceptance**: Documentation diff review and `openspec validate viewer-reward-history --strict`
> **Skills**: `changelog`, `interactive-research`, `openspec-sync-specs`, `openspec-archive-change`
> **Scope**: `CHANGELOG.md` `[Unreleased]`, INT-025 lifecycle, OpenSpec sync/archive after verified implementation
> **Allowed fallout**: concise support note if legacy id fallback needs explanation
> **Blocked**: README/FAQ setup churn, roadmap expansion, marking implemented before verification

- [ ] 5.1 Add concise Russian `[Unreleased]` bullets for the global and per-viewer award journal and preserved grant-time award names.
- [ ] 5.2 Reconcile INT-025 with the actual change lifecycle; keep unresolved achievement work under INT-012 and do not claim achievements ship here.
- [ ] 5.3 After implementation and QA, sync the four delta capabilities to canonical specs and archive the change through the explicit OpenSpec closeout workflow.

## Gate: verification

- [ ] V.1 Run `go test ./internal/store ./internal/api -count=1`.
- [ ] V.2 Run `go test ./... -race -count=1` and `go build ./...`.
- [ ] V.3 Run `golangci-lint run ./...`.
- [ ] V.4 Run `npm ci`, `npm test`, `npm run test:i18n`, and `npm run lint`.
- [ ] V.5 Run `openspec validate viewer-reward-history --strict` and `git diff --check`.

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md`; record automated, responsive browser, migration/rollback, privacy, and packaged-OS coverage with evidence.

## Gate: review

- [ ] R.1 Perform a fresh independent diff review against proposal/specs/design; resolve all CRITICAL/HIGH findings and rerun affected checks.

## Gate: distribution-readiness

- [ ] D.1 Validate upgrade/downgrade and packaged Windows/macOS/Linux readiness from `distribution_plan.md` without signing, notarizing, uploading, or publishing.
