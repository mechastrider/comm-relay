# Implementation Slices

> **Статус (2026-09-05):** UI Studio (кнопка «Test overlay», панель сценариев) **скрыт** — backend и `/overlay/test/*` остаются. Техдолг и доработка: [OQ-002](../../docs/open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), [CR-023](../../docs/tasks/CR-023-overlay-test-tools-rework.md).

## Backend: Isolated overlay test delivery

> **Outcome**: Typed Studio scenarios reach only the process-global dedicated debug audience through production-shaped frames, with deterministic cancellation and no product-state mutation.
> **Acceptance**: `go test ./internal/api/...` and `go test -race ./internal/api/...`
> **Skills**: `comm-relay`, `backend-structure`, `api-conventions`, `comm-relay-backend-golang`, `golang-errors`, `golang-tests`
> **Scope**: WebSocket hub/subscriptions, local action handlers, scenario orchestration, route wiring, focused tests
> **Allowed fallout**: DTOs, fixtures, shared event helpers, router guard expectations, bootstrap wiring
> **Blocked**: production event leakage, product-store writes, arbitrary event JSON, config/database migration, connector changes

- [x] 1.1 Add dedicated `GET /ws/overlay-debug` subscription bookkeeping for one global debug audience while preserving production `/ws`, appearance-setting delivery, reconnect, and slow-client behavior.
- [x] 1.2 Add `POST /api/overlay-debug/scenario/fire` and validate the five enumerated scenarios plus optional `display_name` ≤64, `message` ≤500, `label` ≤80, and integer `points` 1..1000; return the exact started response and unique initial accepting-socket count.
- [x] 1.3 Generate production-shaped immediate message, command alert, and deterministic three-row leaderboard events; implement rewarded-message award at 700 ms and alert-burst command→award→command steps using server-owned timing/durations and safe overrides.
- [x] 1.4 Implement one global run generation: every Fire atomically cancels the prior run, enqueues `debug_reset` before immediate frames, schedules no delayed work at zero receivers, and rechecks generation before each delayed send; Reset cancels/clears only and returns the exact reset response.
- [x] 1.5 Add focused handler/hub tests for exact validation boundaries and responses, zero/one/multiple accepting sockets, production/debug isolation, global contention, settings delivery, reset/new-run races, slow clients, restart semantics, and unchanged product repositories.

## Frontend: Studio test mode and production-path surface playback

> **Outcome**: An operator can run, replay, reset, and observe compatible scenarios in Studio and copied OBS test sources without mixing live data.
> **Acceptance**: `npm test` and a browser smoke with normal live sources plus multiple clients sharing the dedicated debug channel
> **Skills**: `web-static-frontend`, `api-conventions`, `comm-relay`, `ui-styling`, `ux-form-practices`, `web-constrained-layout`, `obs-overlay-themes`
> **Scope**: Studio preview chrome/panel, dedicated test route/URL builders, chat/leaderboard/alert debug connections, shared frame paths, i18n, frontend tests
> **Allowed fallout**: Shared helpers, test exports, CSS tokens/components, deterministic fixtures, accessibility markup
> **Blocked**: raw JSON editor, persistent scenario library, live/test mixing, publishing Studio drafts, OBS remote control

- [x] 2.1 Add fail-closed `/overlay/test/chat`, `/overlay/test/leaderboard`, and `/overlay/test/alert` pages that connect only to `/ws/overlay-debug`; preserve normal overlay routes, `/ws`, and static-sample behavior.
- [x] 2.2 Build the Studio test panel with compatible scenarios, exact bounded labelled fields, globally replacing Run/Replay, global Reset, receiver feedback, shared-channel/test-only guidance, retry, and clipboard fallback.
- [x] 2.3 Build stable active-preset and secondary current-preview snapshot URL copy actions on the dedicated paths; include safe unpublished draft appearance overrides only in snapshots, strip preview/sample/background-only flags, and leave production URLs and active preset untouched.
- [x] 2.4 Route debug chat/reward frames through the existing renderer and clear rows, feedback, timers, and dedupe on `debug_reset`.
- [x] 2.5 Route debug leaderboard/alert frames through production snapshot/queue renderers and clear rankings, visible/pending alerts, timers, and dedupe on `debug_reset`.
- [x] 2.6 Add frontend tests for scenario availability and boundaries, request/response states, stable/snapshot URL behavior, global reset/reconnect, frame reuse, queue ordering, reward animation, fail-closed connections, and Russian/English parity.

## Frontend: Icon actions and Browser Source rectangle contract

> **Outcome**: Familiar contextual actions are quieter and accessible, and every runtime surface fits the user-sized OBS rectangle while preserving its content semantics.
> **Acceptance**: `npm test`, `npm run lint`, and the viewport matrix in `qa_plan.md`
> **Skills**: `admin-design-system`, `web-static-frontend`, `ui-styling`, `obs-overlay-themes`
> **Scope**: Existing copy/refresh/replay controls, preset-management controls, shared text/icon button behavior, chat/leaderboard/alert roots and theme chrome
> **Allowed fallout**: Inline SVG symbols, shared tooltip/a11y helpers, markup tests, responsive theme CSS
> **Blocked**: icon-only ambiguous/primary/destructive actions outside the explicit preset toolbar, new icon dependency, whole-page scaling, stretched chat rows, new theme

- [x] 3.1 Inventory contextual copy, refresh, and replay actions and convert suitable controls to the shared current-color icon pattern with localized accessible names, tooltips, focus, and stable async feedback.
- [x] 3.2 Add/adjust markup and accessibility tests proving icon-only eligibility while visible labels remain for Run, Reset, destructive, and workflow-specific actions.
- [x] 3.3 Make chat and leaderboard runtime roots fill the Browser Source rectangle without changing bottom-anchored message sizing or panel/chips semantics.
- [x] 3.4 Remove intrinsic narrow alert chrome constraints and adapt every alert theme to fill the available rectangle with safe padding, wrapping, and bounded overflow.
- [x] 3.5 Smoke and correct all affected themes at 320×180, 640×360, 1080×1080, 480×720, and 1920×240, including long content and reduced motion.
- [x] 3.6 Restore always-visible icon-only create, rename, duplicate, and delete controls beside the Studio preset selector; remove the preset-count overflow substitution while preserving limits, disabled states, localized tooltips/accessibility names, and delete confirmation.
- [x] 3.7 Give the shared text and icon button components raised rest/hover styling and a pressed active state without changing tabs, navigation, selects, or choice chips.
- [x] 3.8 Add markup, accessibility, behavior, and responsive tests for the preset action group and shared raised button states at supported Studio widths and themes.

## Docs: Operator-facing contract and project guidance

> **Outcome**: Streamers can distinguish sample, test, and live sources, while future overlay work keeps the full-rectangle invariant.
> **Acceptance**: documentation review plus `python3 /home/agent/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/obs-overlay-themes`
> **Skills**: `changelog`, `skill-authoring`, `skill-creator`, `obs-overlay-themes`
> **Scope**: Changelog, relevant operator instructions, project-local overlay skill
> **Allowed fallout**: Cross-links and concise troubleshooting notes
> **Blocked**: release creation, marketing copy, signing, publishing

- [x] 4.1 Strengthen the project-local `obs-overlay-themes` skill so all surface roots fill the Browser Source while inner rows/cards retain intentional sizing.
- [x] 4.2 Add concise Russian `[Unreleased]` changelog bullets for test scenarios, test-only OBS URLs, icon actions, and full-rectangle overlay behavior.
- [x] 4.3 Update relevant operator guidance to explain static sample preview versus isolated test URLs, reset/replay, receiver feedback, and OBS audio verification.

## Verification: QA, review, and distribution readiness

> **Outcome**: The complete change is independently reviewed and green across backend, frontend, OpenSpec, and existing package boundaries.
> **Acceptance**: all exact commands below plus required P0 evidence from `qa_plan.md`
> **Skills**: `golang-tests`, `web-static-frontend`, `obs-overlay-themes`, `changelog`
> **Scope**: Repository checks, Windows/OBS smoke evidence, diff review, package-readiness assessment
> **Allowed fallout**: Narrow fixes required by evidence and test fixtures
> **Blocked**: signing, notarization, artifact upload, release publication

- [x] 5.1 Run `npm ci`, `npm test`, `npm run test:i18n`, and `npm run lint`; record failures and fixes.
- [x] 5.2 Run `go test ./...`, `go test -race ./internal/api/...`, `golangci-lint run ./...`, and `go build ./...`; record failures and fixes.
- [ ] 5.3 Execute the P0 browser and Windows OBS matrix in `qa_plan.md`, including dedicated-route fail-closed isolation, global multi-client cancellation, reward timing, alert burst, responsive rectangles, clipboard fallback, reconnect, and sound policy.
- [x] 5.4 Run `openspec validate studio-overlay-test-tools --strict`, `git diff --check`, and the overlay skill validator; reconcile all planning and implementation drift.
- [ ] 5.5 Perform a fresh full-diff review with zero critical findings and all affected checks green; verify only scoped files changed.
- [ ] 5.6 Validate existing artifact inclusion, stable/snapshot URL behavior, older-build 404 downgrade safety, rollback, and release-note readiness without signing or publishing.
