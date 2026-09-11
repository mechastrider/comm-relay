# Implementation Slices

## Slice: `Durable greeting qualification and catalog`

> **Outcome**: Identified viewers qualify exactly once for the correct fixed greeting across restarts, sessions, commands, exclusions, and canonical merges, while both definitions remain independently editable and disabled by default.
> **Acceptance**: `go test -race ./internal/store ./internal/api`
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `database-migrations`, `golang-errors`, `golang-logging`, `golang-tests`, `api-conventions`
> **Scope**: SQLite migration/bootstrap, store types and transactions, viewer merge/update, greeting GET/update API
> **Allowed fallout**: store/API fixtures, asset reference accounting, response DTOs, router guard tests
> **Blocked**: XP changes, early-arrival rewards, automatic session detection, generic rules engine, connector-specific branches

- [x] 1.1 Add the ordered SQLite migration, locale-aware disabled definition bootstrap, existing-viewer/session backfill, and migration/idempotency tests described in `persistence_schema.md`.
- [x] 1.2 Implement fixed greeting catalog reads/updates with command-equivalent presentation validation and shared asset reference protection.
- [x] 1.3 Extend the transactional chat mutation to classify ordinary lines and return one committed new/returning/suppressed outcome while preserving existing counter and activity behavior.
- [x] 1.4 Extend viewer list/get/update and merge semantics for `greetings_disabled`, all-time/session markers, canonical identity union, and restart/concurrency coverage.

## Slice: `Safe greeting alert delivery and diagnostics`

> **Outcome**: Qualifying greetings render on the existing production alert source at low priority, can be tested only through the debug audience, and leave enough bounded diagnostics to explain missing or suppressed greetings.
> **Acceptance**: `go test -race ./internal/api ./internal/observability && npm run lint`
> **Skills**: `comm-relay`, `api-conventions`, `comm-relay-observability`, `golang-logging`, `golang-tests`, `obs-overlay-themes`, `web-static-frontend`
> **Scope**: viewer ingest, alert payload/scheduler/renderer, greeting preview action, debug audience integration, pipeline diagnostics
> **Allowed fallout**: shared alert helpers, overlay tests, API test clients, built-in SVG emblems, diagnostics JSON/tests
> **Blocked**: production test broadcasts, a new OBS source, platform chat replies, unbounded logs or message-text diagnostics

- [x] 2.1 Confirm `studio-overlay-test-tools` debug routes/audience are available, then add bounded greeting draft preview without persistent or production side effects.
- [x] 2.2 Resolve greeting template variables and media into `source: greeting` frames after committed qualification, including canonical portrait behavior and no XP/history mutation.
- [x] 2.3 Add stable new/returning emblems and route greeting frames through the existing command-equivalent expiring lane with protected award/contract precedence and capacity tests.
- [x] 2.4 Add fired/suppressed greeting diagnostics and privacy-safe contextual logs for kind, viewer/platform identity, exclusion/disabled decisions, and transport drops.

## Slice: `Audience greeting configuration and viewer exclusion`

> **Outcome**: Operators can discover, edit, safely test, and independently enable both greetings in Audience, and suppress both for an individual viewer, with responsive and accessible recovery behavior.
> **Acceptance**: `npm run lint && npm run test:i18n && go test ./internal/api`
> **Skills**: `web-static-frontend`, `ui-ux-pro-max`, `ux-form-practices`, `web-constrained-layout`, `api-conventions`
> **Scope**: Audience tab/router state, fixed list/editor, shared catalog form/media helpers, viewer inspector, EN/RU i18n
> **Allowed fallout**: static markup/CSS/JS modules, focused node tests, API DTO wiring, reusable catalog helper extraction
> **Blocked**: Create/Delete, arbitrary greeting rules, per-platform settings, XP controls, unrelated Audience redesign

- [x] 3.1 Add the `Greetings` Audience tab between Commands and Awards with two fixed status rows, selection state, loading/error/retry behavior, and no Create/Delete controls.
- [x] 3.2 Build the grouped Behavior/Content/Media/Appearance editor by reusing command catalog controls and validation, omitting trigger/action/cooldown/points.
- [x] 3.3 Implement draft Test against the debug audience with honest receiver feedback, busy protection, preserved unsaved values, and a recovery link/instruction for Studio alert test mode.
- [x] 3.4 Add `Exclude from automatic greetings` to viewer detail with helper text, save/recovery behavior, and no retroactive greeting.
- [x] 3.5 Add EN/RU strings, variable-chip tooltips, keyboard/focus behavior, narrow-layout scrolling, and focused markup/helper/i18n tests.

## Slice: `Product documentation and release-facing behavior`

> **Outcome**: Canonical docs and release notes accurately explain where greetings live, how session boundaries and disabling work, and what diagnostics to collect.
> **Acceptance**: `openspec validate first-viewer-greeting --strict && npm run test:i18n`
> **Skills**: `changelog`, `interactive-research`, `openspec-sync-specs`
> **Scope**: Unreleased changelog, interactive initiative status, operator-facing help only where existing docs describe Audience/OBS behavior, canonical spec synchronization at closeout
> **Allowed fallout**: concise Russian user-facing text and links to canonical specs
> **Blocked**: roadmap expansion, claims of automatic stream detection, release announcement or publishing

- [x] 4.1 Add concise Russian `[Unreleased]` bullets for the two disabled-by-default configurable greetings, existing alert source, manual `New stream` boundary, and viewer exclusion.
- [x] 4.2 Reconcile `INT-022` with the active change during implementation and link canonical specs only after sync/archive proves the behavior shipped.
- [x] 4.3 Update only existing operator setup/help text that would otherwise misdescribe Audience greetings or `/overlay/alert`; leave concept/roadmap unchanged unless the product contract is explicitly revised.

## Gate: qa

- [ ] Q.1 Execute the full behavior, migration, API, production/debug isolation, UI accessibility/responsive, and packaged smoke matrix in `qa_plan.md`; record evidence and explicit environment skips.
- [x] Q.2 Run `go test ./internal/store ./internal/api ./internal/observability`.
- [x] Q.3 Run `go test -race ./internal/store ./internal/api`.
- [x] Q.4 Run `go test ./...`.
- [x] Q.5 Run `golangci-lint run ./...`.
- [x] Q.6 Run `npm ci`, `npm run lint`, and `npm run test:i18n`.
- [x] Q.7 Run `openspec validate first-viewer-greeting --strict` and confirm every delta requirement has automated or recorded manual evidence.

## Gate: review

- [x] R.1 Perform a fresh independent diff review against proposal/spec/design/UI/platform/persistence contracts; resolve all CRITICAL findings and rerun affected checks.
- [x] R.2 Verify the final diff contains no connector branching, production preview leakage, message-content logging, unrelated refactor, or accidental changes to existing release sections.

## Gate: distribution-readiness

- [ ] D.1 Validate the existing Windows amd64, macOS universal, Linux amd64, and headless build/package paths include the migration and web assets without artifact-layout changes; do not sign, notarize, upload, or release.
- [x] D.2 Preserve migration backup/rollback evidence and confirm fresh/upgrade defaults remain disabled before declaring distribution readiness.
