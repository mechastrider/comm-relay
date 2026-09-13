# Implementation Slices

## Backend

### Slice: Durable session facts and conservative history

> **Outcome**: Live interaction facts and achievement unlocks carry authoritative session attribution, legacy data is backfilled only when unambiguous, and bounded current/historical session reads work without retaining chat.
> **Acceptance**: `go test ./internal/store/...` and migration Up/Down/Up plus foreign-key checks pass on the fixtures in `qa_plan.md`.
> **Skills**: `database-migrations`, `comm-relay-backend-golang`, `golang-errors`, `golang-logging`, `golang-tests`, `comm-relay-observability`
> **Scope**: `internal/store`, migration `00019`, session/event/progression models and queries
> **Allowed fallout**: store interfaces, fixtures, merge/evaluator callers, diagnostics, migration tests
> **Blocked**: full chat storage, guessed attribution, session labels/export/deletion, new progression metrics

- [ ] 1.1 Add `00019_stream_recaps.sql` with nullable event/unlock `session_id`, recap table, stable history indexes, conservative interval backfill, and a preserving Down migration.
- [ ] 1.2 Add migration fixtures for exact/open/gapped/overlapping intervals, boundary timestamps, backfilled unlock exclusion, preserved row counts, foreign keys, and Up/Down/Up behavior.
- [ ] 1.3 Thread the causal open session id through live command, award, activity, contract-award, and achievement-unlock writes in their existing transactions; keep reconciliation/backfill unlocks sessionless.
- [ ] 1.4 Preserve nullable attribution through viewer merges and achievement uniqueness collisions, retaining the earliest surviving unlock's time and session together.
- [ ] 1.5 Implement typed, cursor-bounded newest-first session summaries/details using `(started_at, id)`, selected-session stats, public ranking/achievement filters, and no raw chat or next-boundary-as-end labeling.
- [ ] 1.6 Add store tests for pagination, old/current session selection, Top 5/six-group ordering, privacy exclusions, empty sessions, missing ids, and attribution/merge paths.

### Slice: Immutable recap capture and runtime control

> **Outcome**: The expected current session can be captured once into a bounded public snapshot, explicitly shown/hidden, recovered across client reconnects, and never used to reset or create a session.
> **Acceptance**: focused store/controller/API race tests pass; manual HTTP/WS smoke proves Show → reload → Hide → process restart hidden.
> **Skills**: `comm-relay`, `backend-structure`, `comm-relay-backend-golang`, `api-conventions`, `golang-errors`, `golang-logging`, `golang-tests`, `comm-relay-observability`
> **Scope**: recap domain/service/controller, bootstrap wiring, `internal/api`, production WebSocket hub
> **Allowed fallout**: typed DTOs/errors, router/static embed registration, diagnostics counters, integration fixtures
> **Blocked**: automatic stream-end detection, snapshot replacement, old-session replay, alert scheduler changes

- [ ] 2.1 Define the version-1 bounded public recap DTO and validate identity, timestamps, counts, string/URL bounds, ranking length, achievement grouping, and supported versions on encode/read.
- [ ] 2.2 Implement serialized first capture for an expected open `session_id`, unique-conflict convergence/reuse, insert-only snapshot storage, and unchanged counters/session facts on Show/Hide.
- [ ] 2.3 Implement the lock-protected ephemeral visibility controller, startup-hidden state, idempotent Hide, and post-commit New stream hiding without persisting visibility.
- [ ] 2.4 Add `GET /api/stream-recaps/current` with current session detail/state plus `POST /api/stream-recaps/show` and `POST /api/stream-recaps/hide` with strict bodies and safe 400/409/503/500 mappings.
- [ ] 2.5 Add `GET /api/sessions` and `GET /api/sessions/get?id=...` with limit/cursor validation, snake_case DTOs, 404 mapping, and router-guard coverage.
- [ ] 2.6 Publish and seed `stream_recap_state` on production `/ws`, isolate debug clients, preserve bounded non-blocking delivery, and attach existing drop diagnostics.
- [ ] 2.7 Register `/overlay/recap` and trailing-slash asset serving in both embedded and development-web modes without shadowing chat, leaderboard, alert, admin, or dock routes.
- [ ] 2.8 Add concurrency/integration tests for duplicate Show, Show versus New stream/live writes, cancellation/rollback, stale ids, exact replay, reconnect state, process restart, stalled clients, and unrelated-client compatibility.

### Slice: Backward-compatible recap appearance

> **Outcome**: Every preset may override recap backdrop opacity while old config stays byte/behavior compatible and explicit zero survives.
> **Acceptance**: `go test ./internal/config/...` covers omitted/0/1/invalid/unknown values and unchanged-load behavior.
> **Skills**: `comm-relay`, `comm-relay-backend-golang`, `golang-validation`, `golang-tests`
> **Scope**: overlay preset config types/default resolution/validation and API DTO mapping
> **Allowed fallout**: config fixtures and validation localization keys
> **Blocked**: page opacity, independent recap presets, config migration into SQLite

- [ ] 3.1 Add presence-aware `surfaces.recap.panel_opacity`, theme-derived in-memory defaults, and validation from 0 through 1 without load-time materialization.
- [ ] 3.2 Extend config/API tests for legacy omission, explicit zero, boundaries, non-finite/type/out-of-range input, unknown keys, save/restore, and unchanged stored config after failure.

## Frontend

### Slice: Dedicated full-canvas OBS recap

> **Outcome**: `/overlay/recap` is a safe, transparent-when-hidden, reconnecting full-canvas finale that renders the immutable server snapshot in every shipped theme and common OBS aspect ratio.
> **Acceptance**: new Node rendering/lifecycle tests pass and the `qa_plan.md` five-theme screenshot matrix has no clipping, scrollbars, unsafe markup, or hidden-state chrome.
> **Skills**: `obs-overlay-themes`, `web-static-frontend`, `ui-styling`
> **Scope**: new `web/recap`, shared overlay settings/preset helpers, theme CSS/tokens, frontend tests
> **Allowed fallout**: shared safe portrait/text utilities, deterministic sample fixture, embed manifests/tests
> **Blocked**: reusing `/overlay/alert`, alert timers/queue, interactive on-stream controls, framework adoption

- [ ] 4.1 Build the minimal recap document and safe text/portrait renderer for closing title, totals, Top 5, grouped achievements, empty-section collapse, and deterministic fallbacks.
- [ ] 4.2 Implement production WebSocket initial/update handling, unknown-frame tolerance, bounded reconnect, exact visible snapshot restoration, and full DOM clearing/transparency on Hide.
- [ ] 4.3 Implement isolated `preview=sample` behavior that uses fictitious bounded data/draft appearance and never reads history or applies/mutates production recap state.
- [ ] 4.4 Add responsive landscape/square/portrait compositions for `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`, including theme-default opacity and explicit zero.
- [ ] 4.5 Add reduced-motion, long RU/EN text, zoom/scaling, broken portrait, hostile text, min/max/empty data, source-rectangle, and no-scroll/no-visible-hidden regression tests.
- [ ] 4.6 Smoke the dedicated recap beside a short alert Browser Source and prove their geometry, state, queues, and animations remain independent.

### Slice: Live recap control and compact session history

> **Outcome**: Operators can review current/history data, permanently capture the current session after explicit confirmation, and show/hide it from an accessible constrained dialog without confusing Recap with New stream.
> **Acceptance**: admin Node tests plus keyboard-only 700px-height/200%-zoom smoke cover current, history, confirmation, conflict, offline, and recovery states.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`, `ui-styling`, `api-conventions`
> **Scope**: Live workspace markup/state/i18n/API client, recap modal, history pagination/detail
> **Allowed fallout**: shared modal/status helpers and focused markup/state tests
> **Blocked**: Analytics workspace, charts/export/delete/rename, historical production replay, dock controls

- [ ] 5.1 Add the separate Live Recap action and constrained modal shell with pinned header/footer, scrollable body, Current stream/History switch, focus trap/return, and localized accessible labels/status.
- [ ] 5.2 Implement current summary/snapshot rendering, permanent/no-reset confirmation, expected-session Show, idempotent Hide/Show again, busy guards, and no optimistic mutation.
- [ ] 5.3 Implement bounded newest-first history pagination, session detail/back navigation, captured/current markers, sessions-without-recap empty states, and no historical Show action.
- [ ] 5.4 Handle safe errors, retry/offline recovery, HTTP 409 stale-session refresh, WebSocket visibility updates, and interrupted confirmations without automatic resubmission.
- [ ] 5.5 Add focused state/markup/API tests for cancel-without-request, exact bodies/URLs, duplicate-submit prevention, cursor handling, stale conflicts, XSS-safe rendering, focus, and constrained overflow.

### Slice: Studio preview and OBS setup

> **Outcome**: Recap is a fourth Studio surface with isolated sample preview/opacity publishing, and every setup location gives correct full-canvas follow-active and pinned OBS URLs.
> **Acceptance**: Studio/setup/i18n Node tests pass; manual preview/publish and URL copy/open smoke leaves production visibility and existing source URLs unchanged.
> **Skills**: `obs-overlay-themes`, `web-static-frontend`, `ux-form-practices`, `ui-styling`
> **Scope**: Studio selector/draft/publish/preview, setup copy/open UI, locales
> **Allowed fallout**: surface-opacity helpers, preview query builder, admin markup tests
> **Blocked**: direct OBS scene mutation, new desktop/native menu, per-achievement recap media

- [ ] 6.1 Add Recap to Studio surface selection and preview routing while preserving all unpublished per-surface draft values.
- [ ] 6.2 Add labelled 0..1 recap backdrop-opacity editing, theme-default display, publish/revert/error focus, and explicit-zero handling without production Show/Hide side effects.
- [ ] 6.3 Add Recap to every existing OBS setup surface with follow-active and `?preset=<id>` URLs, Copy/Open feedback, and full-canvas/z-order guidance.
- [ ] 6.4 Add RU/EN locale keys and parity, Studio state/markup, opacity, query/URL, clipboard failure, and production-isolation tests.
- [ ] 6.5 Confirm `/dock/messages`, chat, leaderboard, alert, and their setup URLs/controls remain unchanged when recap frames and settings arrive.

## Docs

### Slice: Operator guidance and durable product contracts

> **Outcome**: Operators understand the separate OBS source, immutable manual capture, no-reset behavior, session history, upgrade limits, and troubleshooting path; canonical specs match the delivered behavior.
> **Acceptance**: RU/EN docs are link-checked/reviewed, `[Unreleased]` contains concise streamer-facing bullets, and OpenSpec sync/archive is prepared only after implementation is accepted.
> **Skills**: `changelog`, `comm-relay`, `openspec-sync-specs`, `openspec-archive-change`
> **Scope**: `README*.md`, `docs/FAQ*.md` or existing OBS setup docs, `CHANGELOG.md`, canonical OpenSpec closeout
> **Allowed fallout**: screenshots/help copy directly required by the feature
> **Blocked**: release announcement, tag/release publication, roadmap promises for non-goals

- [ ] 7.1 Update Russian and English setup/help text with the dedicated canvas-sized `/overlay/recap`, follow-active/pinned examples, source z-order, and troubleshooting for hidden/reconnect/restart behavior.
- [ ] 7.2 Document that first confirmed Show fixes the session snapshot permanently, never ends/resets the session, and legacy session attribution can remain incomplete when ambiguous.
- [ ] 7.3 Add concise Russian `[Unreleased]` bullets for the visible recap, compact history, Studio/setup affordances, and explicit no-auto-reset behavior without rewriting released sections.
- [ ] 7.4 After implementation/review acceptance, sync the nine capability deltas to canonical specs and archive the change; do not archive while required QA evidence or tasks remain open.

## Verification

### Gate: automated checks

- [ ] V.1 Run `gofmt` and `goimports` on every touched Go file; verify no formatting diff remains.
- [ ] V.2 Run `go test ./...`.
- [ ] V.3 Run `go test -race ./internal/store ./internal/api ./internal/bus ./internal/bootstrap` (adjust only to include the actual recap controller/broadcaster owner, never excluding store/API).
- [ ] V.4 Run `golangci-lint run ./...`.
- [ ] V.5 Run `npm ci` once for the clean frontend dependency set, then `npm run lint`.
- [ ] V.6 Run `npm test` and `npm run test:i18n`.
- [ ] V.7 Run `openspec validate end-of-stream-recap --strict` and `git diff --check`.

### Gate: qa

- [ ] Q.1 Execute every P0 scenario in `qa_plan.md`; attach command output, HTTP/WS assertions, migration integrity results, and unresolved failures.
- [ ] Q.2 Complete the five-theme × three-aspect-ratio OBS matrix with empty/min/max/hostile fixtures, hidden transparency, reduced motion, and Alert/Recap rectangle independence evidence.
- [ ] Q.3 Complete keyboard/focus/short-height/200%-zoom and RU/EN Live/Studio checks, including cancel, stale conflict, offline/retry, and production-isolated preview.
- [ ] Q.4 Run fresh-install, sanitized pre-`00019` upgrade, binary rollback, schema Down/Up test, reconnect/sleep, and process-restart-hidden lifecycle checks without using real user data.

### Gate: review

- [ ] R.1 Perform a fresh independent diff review against proposal/spec/design/UI/platform/persistence/distribution/QA contracts; require CRITICAL=0 and resolve every correctness, privacy, concurrency, migration, accessibility, and OBS-layout finding.
- [ ] R.2 Confirm router conventions, safe error mapping, session/visibility non-interference, public-data filtering, observability for capture/conflict/drop/failure, and no unrelated product or dock changes.
- [ ] R.3 Re-run every affected automated command after review fixes and record the final green commit/diff state.

### Gate: distribution-readiness

- [ ] D.1 Verify recap assets are embedded in headless and Wails builds and artifact contents/names remain the existing Windows amd64 ZIP, macOS universal ZIP, and Linux amd64 tarball layouts.
- [ ] D.2 Record per-platform packaged smoke results for fresh/upgrade/restart-hidden behavior and confirm no config/database/user fixture is bundled.
- [ ] D.3 Review migration backup/rollback and release/support notes against `distribution_plan.md`; confirm minimum OS, permissions, signing/notary status, and update channels are unchanged.
- [ ] D.4 Stop at readiness: do not sign, notarize, tag, upload, publish, modify production OBS scenes, or run against production user data without separate authority.
