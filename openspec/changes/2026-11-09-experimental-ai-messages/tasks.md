# Implementation Slices

Implementation is in progress; checkboxes reflect implemented behavior and recorded verification, not external provider/native-platform assumptions. Each checkbox is a bounded work item targeted at no more than two hours; split further if implementation evidence exceeds that size. Slices group complete outcomes rather than authorizing parallel agents.

## Slice: Configure an opt-in experiment without changing ordinary commands

> **Outcome**: Operator can configure and enable valid AI profiles and character/image bindings.
> **Acceptance**: `go test ./internal/config/... ./internal/command/... ./internal/api/...`; `npm run typecheck`; config/trigger fixtures in qa_plan.
> **Skills**: comm-relay, api-conventions, comm-relay-backend-golang, golang-validation, golang-tests, ux-form-practices, form-field-help
> **Scope**: Config, command admission, admin settings, existing asset references.
> **Allowed fallout**: DTOs, settings UI, fixtures, validation.
> **Blocked**: pack schema change, hardcoded themed content, level gates, publication.

- [x] 1.1 Backend: add default-off feature/config contracts, bounded limits and environment credential references with omission/false round-trip tests.
- [x] 1.2 Backend: add character/image binding validation and pinning/invalidation rules against existing alert command assets.
- [x] 1.3 Frontend: add experimental switch and provider/policy forms with key-reference help and safe missing-key status.
- [x] 1.4 Frontend: add character/image binding and limit forms with validation, localization and accessible layout.
- [x] 1.5 Backend: add exact !m admission, trigger conflict checks, stable identity/dedupe hooks and safe chat visibility without ordinary command effects.

## Slice: Produce a validated, moderated message with bounded paid work

> **Outcome**: An eligible message becomes a validated prepared result or a clear rejection/failure without blocking chat.
> **Acceptance**: `go test -race ./internal/aimessage/... ./internal/command/...`; fake-provider corpus.
> **Skills**: backend-structure, comm-relay-backend-golang, runnable-background-processes, golang-errors, golang-logging, comm-relay-observability, database-migrations, golang-tests
> **Scope**: Service, provider adapters, audit, bootstrap lifecycle.
> **Allowed fallout**: migrations, fake provider fixtures, metrics.
> **Blocked**: agent tools, paid retries, provider fallback, creative rewriting.

- [x] 2.1 Backend: add additive audit/tombstone migration and revision-checked storage with retention fixtures.
- [x] 2.2 Backend: add bounded queue/cooldowns/deadlines and runnable cancellation with deterministic clock tests.
- [x] 2.3 Backend: implement shared Chat Completions client, presets, schema/JSON modes, safe errors and response bounds.
- [x] 2.4 Backend: implement input preparation/policy prompt and typed catalog/segment validation with synthetic fixtures.
- [x] 2.5 Backend: implement independent final verdict, precedence and uncertainty routing; cover meaning preservation and rejection.
- [x] 2.6 Backend: add provider pause/backoff/resume and late-response suppression; verify no retries and bounded observability.

## Slice: Confirm uncertain messages without changing approved content

> **Outcome**: Operator reviews exact content and approves once or rejects; other messages keep processing.
> **Acceptance**: `go test -race ./internal/api/... ./internal/aimessage/...`; `npm test`; review Playwright cases.
> **Skills**: api-conventions, golang-tests, ux-form-practices, web-constrained-layout
> **Scope**: POST actions, job list, admin review/history and row statuses.
> **Allowed fallout**: status polling, localized errors, accessibility tests.
> **Blocked**: editing approved text, platform replies, raw moderation data in OBS.

- [x] 3.1 Backend: add bounded list and revision-based approve/reject/cancel/resume/clear-history actions with conflict tests.
- [x] 3.2 Frontend: implement review list/detail, exact content preview, expiry, focus and stale-state handling.
- [x] 3.3 Frontend: implement recent-job/service states and admin/dock row status; distinguish dispatched from played.
- [x] 3.4 Verification: exercise double approval, queue-full recovery, expired review, config revision cancellation and secret exclusion.

## Slice: Hear and see ready messages safely in OBS and the desktop shell

> **Outcome**: Approved content becomes local speech and one expiring cancelable alert, respecting audio controls.
> **Acceptance**: `npm run build`; `go test -race ./internal/aimessage/... ./internal/api/...`; `npm run test:e2e`; packaged OBS smoke.
> **Skills**: comm-relay, obs-overlay-themes, web-static-frontend, comm-relay-observability, golang-tests
> **Scope**: ElevenLabs adapter, generated assets, alert scheduling and app sound.
> **Allowed fallout**: duration parsing, cleanup, fixtures, isolated provider test action.
> **Blocked**: image/voice generation, ordinary message TTS integration, signing/release.

- [x] 4.1 Backend: implement ElevenLabs synthesis, semantic delivery renderer and bounded audio/duration validation.
- [x] 4.2 Backend: add atomic media lifecycle, ready snapshots and at-most-once dispatch attempt with crash fixtures.
- [x] 4.3 Frontend: add AI alert lane/deadline/dedupe and cancellation without changing ordinary/protected scheduling.
- [x] 4.4 Frontend: respect command-sound mute/volume in app and independent OBS audio; prevent historical/ordinary-chat replay.
- [x] 4.5 Backend: finish restart/new-stream/disable cancellation, cleanup grace and asset ownership tests.
- [x] 4.6 Frontend/backend: add explicit paid test action with no production OBS delivery and sanitized results.

## Gate: qa
- [x] Q.1 Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.
- [x] Q.2 Run `go test ./...`, targeted race command from qa_plan, `golangci-lint run ./...` and `go build ./cmd/comm-relay-server`.
- [ ] Q.3 Evaluate synthetic moderation corpus and authorized provider smoke; report exact model/voice coverage and unknown costs.
- [ ] Q.4 Execute Windows packaged/OBS lifecycle and environment-secret checks; record evidence.
- [x] Q.5 Execute macOS packaged/OBS checks on supported architectures or explicitly record coverage gap.
- [x] Q.6 Execute Linux packaged/OBS checks or explicitly record coverage gap.

## Gate: review
- [x] R.1 Review final diff and contracts; CRITICAL=0, affected checks green, no secrets or unintended command effects.
- [x] R.2 Docs: add setup/provider/experimental limitations and Russian Unreleased behavior bullets at implementation time.
- [x] R.3 Docs: sync deltas to canonical specs using openspec-sync-specs, reconcile initiative status and archive only after completion.

## Gate: distribution-readiness
- [ ] D.1 Validate existing package upgrade/default-off, backup/downgrade and unchanged release matrix without signing or publishing.

## Verification status

Implementation slices and automated checks are complete; see [implementation evidence](implementation-evidence.md). Q.3, Q.4 and D.1 retain live-provider, actual packaged Windows/OBS and installed-version downgrade checks. Q.5/Q.6 explicitly record native-host coverage gaps. Keep the experiment default-off and do not archive this change until remaining external verification is resolved.
