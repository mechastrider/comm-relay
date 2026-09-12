# Implementation Slices

## Backend

### Slice: Durable progression foundation

> **Outcome**: Fresh and upgraded stores own valid localized level/achievement catalogs, immutable rule revisions, unlock history, alert settings, viewer suppression, and resumable reconciliation state.
> **Acceptance**: `go test ./internal/store/... -run 'Progression|Achievement|Level|Migration|Bootstrap'`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `database-migrations`, `golang-errors`, `golang-tests`
> **Scope**: `internal/store`, migration 17+, bootstrap fixtures and store models
> **Allowed fallout**: store interfaces, migration runner, fixtures, API-facing DTOs
> **Blocked**: moving `config.json` into SQLite, deleting history, Credits, custom media

- [x] 1.1 Add the additive SQLite migration with constrained progression tables, indexes, `progression_alerts_disabled`, and reversible down statements; cover fresh and v16 migration plus foreign-key/integrity checks.
- [x] 1.1a Add the additive command-id migration for successful interaction events; backfill only unambiguous legacy trigger rows, preserve unresolved history, and test upgrade/retry/rollback behavior.
- [x] 1.2 Implement bounded store models and CRUD for levels, achievement definitions/revisions, unlock history, alert settings, and reconciliation status with contextual errors.
- [x] 1.3 Implement the progression-specific pending-locale bootstrap and RU/EN starter definitions; test crash retry, stable ids, upgrade initialization, and no reseed/retranslation after user edits.
- [x] 1.4 Add query-plan fixtures for the six supported metrics, including stable command-id counts, and only the evidence-backed indexes required by those plans.

### Slice: Idempotent live evaluation and silent reconciliation

> **Outcome**: Every committed viewer fact produces correct level/progress/unlocks exactly once, while administrative/history scans remain resumable and silent.
> **Acceptance**: `go test -race ./internal/store ./internal/bootstrap -run 'Progression|Reconciliation|Award|Command|Contract|Activity'`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `runnable-background-processes`, `comm-relay-observability`, `golang-logging`, `golang-tests`
> **Scope**: store transactions, fact-producing services, bootstrap wiring, background reconciler
> **Allowed fallout**: award/command/contract/message call sites, bus result DTOs, diagnostics counters
> **Blocked**: connector-specific logic, arbitrary expressions, XP from achievements, historical production alerts

- [x] 2.1 Implement metric readers and level resolution for messages, all-time XP, award id, successful command id, distinct participating sessions, and contract wins; test deleted subject behavior.
- [x] 2.2 Evaluate affected rules inside serialized fact transactions and return one post-commit result bundle; cover one-time/repeatable thresholds, atomic multi-crossing, retries, rollbacks, and zero bonus XP.
- [x] 2.3 Wire message/activity, award, successful command, and contract-win causes to evaluation without changing connector normalization or existing award repetition semantics.
- [x] 2.4 Implement generation-based bounded reconciliation for startup, upgrades, rule revisions, and explicit recovery with cancellation/checkpoint resume and `backfilled` unlocks.
- [x] 2.5 Add contextual logs and pipeline diagnostics for bootstrap/reconciliation state, evaluated causes, inserted/suppressed unlocks, post-commit publish, and drops without raw messages or secret-definition details.

### Slice: Safe historical viewer merge

> **Outcome**: Canonical merge preserves every historical progression input and unlock exactly, atomically, and without celebration.
> **Acceptance**: `go test -race ./internal/store ./internal/api -run 'ViewerMerge|Merge.*Progression|Historical'`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `golang-errors`, `comm-relay-observability`, `golang-tests`
> **Scope**: viewer merge transaction, stats/events/contracts/unlocks/flags, merge API regression
> **Allowed fallout**: merge helpers, fixtures, diagnostics
> **Blocked**: unmerge, automatic identity matching, destructive source-history cleanup outside the transaction

- [x] 3.1 Replace current-period-only consolidation with upsert-add for every overlapping/non-overlapping session and day row before source removal.
- [x] 3.2 Reassign interactions and applicable contracts, collapse unlock key collisions to the earliest timestamp, OR viewer opt-outs, and run silent progression reconciliation in the merge transaction.
- [x] 3.3 Add fault-injection and cross-platform fixtures proving exact sums, preserved participation, one audit, rollback on failure, and zero production alerts.

### Slice: Local progression API and event contract

> **Outcome**: Admin and overlays receive bounded progression catalogs/details/settings, isolated draft previews, and one ordered aggregate live frame.
> **Acceptance**: `go test ./internal/api ./internal/bus -run 'Progression|Viewer.*Secret|Preview|WebSocket|AlertOrder'`
> **Skills**: `api-conventions`, `comm-relay-backend-golang`, `golang-validation`, `golang-errors`, `comm-relay-observability`, `golang-tests`
> **Scope**: routes/handlers, wire DTOs, debug audience, hub publication, viewer/leaderboard reads
> **Allowed fallout**: router guard fixtures, public config DTO, API test helpers
> **Blocked**: PUT/PATCH/DELETE verbs, id path parameters, remote URLs, production preview broadcast

- [x] 4.1 Add level, achievement, settings, reconciliation-status, and viewer-progression reads plus POST-action mutations with snake_case bounded validation and atomic error behavior.
- [x] 4.2 Filter locked secret definitions server-side and expose only the compact current-level summary in viewer lists plus full permitted progress in viewer detail.
- [x] 4.3 Add `POST /api/progression/preview` using the existing overlay-debug audience; prove dirty drafts do not persist, mutate facts, or reach production clients.
- [x] 4.4 Define and publish the aggregate `viewer_progression` wire DTO after commit and after its causal award/contract alert; cover empty/suppressed results, old-client tolerance, and slow-client drops.
- [x] 4.5 Include current level summaries in leaderboard data without changing rank calculation, period semantics, eligibility, or the existing frame's required fields.

## Frontend

### Slice: Audience progression catalogs

> **Outcome**: Operators can understand, create, revise, test, disable, and delete achievements/levels and configure shared unlock alerts in the established Audience workflow.
> **Acceptance**: `npm test && npm run lint`; browser smoke from `ui_contract.md` at 1440×900, 1100×700, and 390×844
> **Skills**: `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`, `ui-styling`, `comm-relay`
> **Scope**: `web/admin`, shared i18n/catalog helpers, progression API client
> **Allowed fallout**: reusable catalog components, CSS tokens, JS unit fixtures
> **Blocked**: framework migration, visual expression builder, permanent Live/dock progression UI, per-definition media

- [x] 5.1 Add Progression to the six-tab Audience order and implement accessible horizontal tab overflow/selected-tab visibility without regressing Greetings, routing, or browser history.
- [ ] 5.2 Build the Achievements list/editor with search/filters, conditional subject input, readable condition preview, bounds, dirty guard, revision confirmation, deletion semantics, and isolated dirty-draft Test unlock.
- [ ] 5.3 Build the auto-sorted Levels list/editor with protected baseline behavior, duplicate-threshold errors, dirty guard, and isolated Test level-up.
- [ ] 5.4 Build Unlock alerts shared settings with independent type toggles and draft-aware test actions; omit upload/per-definition media controls.
- [ ] 5.5 Implement loading, empty, missing-subject, reconciliation, offline/error/retry, and compact height/width states with pinned reachable actions and focus recovery.
- [ ] 5.6 Add RU/EN strings and automated i18n, markup, form-state, tab-overflow, and keyboard/accessibility coverage.

### Slice: Viewer progression at a glance

> **Outcome**: The viewer directory and detail card explain current title, next threshold, achievements, repeat counts, and alert exclusion without leaking secrets or disrupting live editing.
> **Acceptance**: `npm test -- --test-name-pattern='viewer|progress|audience'` plus keyboard/screen-reader browser smoke
> **Skills**: `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`, `ui-styling`, `comm-relay`
> **Scope**: Audience viewer list/detail rendering and WS refresh
> **Allowed fallout**: shared progress/achievement render helpers and tests
> **Blocked**: new sort/column, public viewer profile, chat badges, achievement hints for locked secrets

- [x] 6.1 Add the compact current-title badge/secondary line to viewer rows without a new column or sort and preserve narrow-layout density.
- [x] 6.2 Add the detail progression summary, accessible next-level progress/max-level state, unlocked/repeated and permitted in-progress achievements.
- [x] 6.3 Add and persist the per-viewer progression-alert exclusion beside existing leaderboard/greeting controls with failure recovery.
- [ ] 6.4 Refresh an open row/card from live progression frames without reloading, moving scroll/focus, or discarding unsaved viewer fields; test merge recovery and secret filtering.

### Slice: On-stream progression recognition

> **Outcome**: Existing alert and leaderboard Browser Sources present progression clearly, compatibly, and responsively with no new OBS setup.
> **Acceptance**: `npm test -- --test-name-pattern='alert|leaderboard|progress' && npm run lint`; transparent Browser Source smoke
> **Skills**: `obs-overlay-themes`, `web-static-frontend`, `ui-styling`, `comm-relay`
> **Scope**: `web/alert`, `web/leaderboard`, Studio sample/fields, overlay preset config UI
> **Allowed fallout**: alert scheduler/render helpers, leaderboard fit logic, theme CSS, config tests
> **Blocked**: new OBS URL, chat badges, per-achievement media, changing leaderboard order/visibility policy

- [x] 7.1 Render achievement-only, level-only, and combined progression variants in every alert theme with safe text, semantic fallback emblem/portrait, reduced motion, and no empty regions.
- [x] 7.2 Extend the alert scheduler so progression is protected, non-preempting, non-expiring, capacity-safe, and ordered after its causal source alert; preserve command/greeting and award/contract rules.
- [x] 7.3 Add `show_viewer_titles` to preset config/defaulting/validation, Studio leaderboard draft/sample/Publish, and live leaderboard rows without changing legacy appearance when omitted.
- [x] 7.4 Update responsive fitting so optional title text is removed before rank/name/XP or a complete row; cover panel/chips, all themes, short rectangles, and fictitious samples.
- [x] 7.5 Extend the existing Alerts sample/Replay coverage with representative progression while keeping production/debug isolation and page transparency.

## Docs

### Slice: Operator-facing contract and release communication

> **Outcome**: Canonical behavior and user-facing release notes describe the shipped progression system and its operational boundaries.
> **Acceptance**: `openspec validate viewer-ranks-and-achievements --strict && git diff --check`
> **Skills**: `openspec-sync-specs`, `changelog`, `comm-relay`
> **Scope**: OpenSpec canonical specs and `CHANGELOG.md` `[Unreleased]`
> **Allowed fallout**: README/FAQ only if implementation changes setup or troubleshooting
> **Blocked**: release announcement, roadmap commitments for Credits/MVP/streaks, versioning or publishing

- [ ] 8.1 Reconcile implemented behavior with every delta spec, resolve any implementation-discovered contract change explicitly, and sync canonical specs before archive/closeout.
- [x] 8.2 Add concise Russian `[Unreleased]` bullets for titles/achievements, Audience UI, optional leaderboard titles, combined alerts, and silent upgrade backfill; preserve all released sections.
- [ ] 8.3 Update README/FAQ only if real setup, migration recovery, or OBS troubleshooting differs from current instructions; otherwise record the intentional skip.

## Verification

### Gate: QA

- [x] Q.1 Execute `qa_plan.md` P0 scenarios and record platform/matrix evidence, explicit skips, versions, screenshots, API/WS captures, migration integrity, and diagnostics privacy.
- [x] Q.2 Run `go test ./...`.
- [x] Q.3 Run `go test -race ./internal/store ./internal/api ./internal/bus ./internal/bootstrap` on a race-capable environment.
- [x] Q.4 Run `golangci-lint run ./...`.
- [x] Q.5 Run `npm ci && npm test && npm run lint`.
- [x] Q.6 Run `go build ./...` and smoke embedded plus `-web ./web` headless operation.
- [x] Q.7 Run `openspec validate viewer-ranks-and-achievements --strict && git diff --check`.

### Gate: Review

- [ ] R.1 Perform a fresh independent diff review against the proposal, specs, design, UI/platform/persistence/distribution contracts, and QA evidence; resolve all CRITICAL/HIGH findings and record accepted lower-severity trade-offs.
- [ ] R.2 Verify only intended files changed, no user data/assets were added, migration numbering is current after rebase, every observable change has tests/diagnostics, and the unrelated active `studio-overlay-test-tools` change remains untouched.

### Gate: Distribution-readiness

- [ ] D.1 Execute fresh-install, populated-upgrade, interrupted-recovery, disposable downgrade/forward, graceful-shutdown, and packaged Windows/macOS/Linux smoke from `distribution_plan.md`; record unavailable cells.
- [ ] D.2 Confirm artifact names/layout, minimum OS/runtime dependencies, signing/notary policy, OBS URLs, config/data paths, and release workflow are unchanged; do not sign, notarize, upload, tag, or publish.

### Gate: OpenSpec closeout

- [ ] O.1 After implementation and verification, sync the deltas to canonical specs and archive `viewer-ranks-and-achievements`; ensure no requirement or evidence is lost.
