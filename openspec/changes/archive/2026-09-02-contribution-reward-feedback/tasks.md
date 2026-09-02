# Implementation Slices

## Slice: Rewarded message becomes visible on stream

> **Outcome**: A grant from Live or the OBS dock carries a bounded source-message snapshot, updates score once, reports success to the operator, highlights the exact visible chat row, and produces one contextual award alert without persisting chat text.
> **Acceptance**: `go test ./internal/api/... ./internal/store/...`; `npm test`; manual grant from admin and constrained dock against a visible and an expired row.
> **Skills**: `comm-relay`, `api-conventions`, `golang-tests`, `web-static-frontend`, `obs-overlay-themes`, `ux-form-practices`
> **Scope**: Award grant handler/wire model, shared reward picker, chat overlay, alert payload fixtures, English/Russian UI copy.
> **Allowed fallout**: Shared helpers, test fixtures, theme styles, API documentation, and changelog.
> **Blocked**: Persistent chat text, saved messages, economy redesign, custom media, template-language expansion, signing, or publishing.

### Backend and protocol

- [x] 1.1 Extend the award-grant request with optional `message_id` and `message_text`, add a reusable trim-and-280-code-point bound, and cover missing identity, unknown award, Unicode boundary, and no-context grants.
- [x] 1.2 Enrich the existing `alert` wire envelope with optional award/message context and `created_at`, preserving command fixtures and old-field decoding behavior.
- [x] 1.3 Keep interaction persistence limited to platform/id, add focused assertions that quote text never reaches SQLite, config, structured logs, diagnostics, errors, or durable DTOs.

### Frontend and UI

- [x] 1.4 Update the shared admin/dock reward flow to submit selected-row context, prevent duplicate submission, and show localized visible plus live-region success or retryable error with correct focus return.
- [x] 1.5 Add exact `platform`+`message_id` chat-row lookup, a resettable 2.5-second reward treatment, and safe no-op behavior for absent/expired rows.
- [x] 1.6 Add reward-highlight styling to every current chat theme, including a non-color points label, no layout shift, long-text resilience, and static reduced-motion treatment.

### Focused verification

- [x] 1.7 Add Go and JavaScript tests for grant compatibility, transient quote privacy, exact row matching, repeated-timer reset, accessible status copy, and admin/dock failure recovery.

## Slice: Manual awards win the alert queue without overlapping gameplay

> **Outcome**: The alert surface keeps one visible splash, prioritizes queued awards over commands, expires stale commands, enforces a bounded queue, and presents awards differently from commands in every theme.
> **Acceptance**: `npm test`; sample-preview inspection of all themes; deterministic fake-clock checks for priority, expiry, capacity, reload, and audio failure.
> **Skills**: `comm-relay`, `web-static-frontend`, `obs-overlay-themes`
> **Scope**: `/overlay/alert` scheduler, rendering, sounds, sample preview, shared/theme CSS.
> **Allowed fallout**: Pure scheduler helper, fake clock/fixtures, accessibility and reduced-motion styles.
> **Blocked**: Simultaneous cards, visible stack/ticker, queue inspector, durable delivery, redemptions, refunds, OBS scene control, or configurable timing in this slice.

### Frontend and UI

- [x] 2.1 Extract a testable two-lane alert scheduler with one non-preempting visible item, award-first selection, per-lane FIFO order, 10-second command expiry, legacy receive-time fallback, and a combined pending cap of 20.
- [x] 2.2 Implement every capacity branch: an award displaces the oldest command then oldest award, while a command may replace only the oldest command and never an award.
- [x] 2.3 Render distinct command and award DOM variants using text nodes, with award name, viewer, positive points, optional quote, safe avatar/quote fallbacks, and queue progress after missing/failed audio.
- [x] 2.4 Add equivalent award hierarchy to `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`, with long Cyrillic/Latin wrapping and reduced-motion fallbacks.
- [x] 2.5 Extend alert sample preview so an award with a quote can be inspected without consuming a live frame or changing transparent live-page behavior.

### Focused verification

- [x] 2.6 Add fake-clock scheduler tests for insertion, selection, expiry, capacity, unknown-source compatibility, and reload-empty behavior; add DOM tests for safe text rendering and missing optional fields.

## Slice: Live workspace reflects operator actions immediately

> **Outcome**: Live Leaderboard uses matching WebSocket snapshots, active Statistics refreshes at a bounded rate, catalog selection remains obvious, and New stream aligns with the Live toolbar without changing its behavior.
> **Acceptance**: `npm test`; `npm run test:i18n`; keyboard and narrow-width admin smoke with reconnect and HTTP-error cases.
> **Skills**: `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`
> **Scope**: Admin Live state/rendering, Statistics invalidation, Commands/Awards selection styles and semantics, Live toolbar layout, localized copy.
> **Allowed fallout**: Shared admin state helpers, abort/debounce utilities, CSS, fixtures, localization keys.
> **Blocked**: Audience table redesign, tab-system redesign, saved-message analytics, new statistics API, or New stream semantics changes.

### Frontend and UI

- [x] 3.1 Cache the newest leaderboard snapshot per period and apply only a frame matching the active Live Leaderboard period without resetting the existing loading/recovery state.
- [x] 3.2 Add cancelable Statistics invalidation with at most one active refresh per second, refresh-on-open for a hidden dirty view, and cancellation when workspace/period changes make work obsolete.
- [x] 3.3 Add persistent, semantic selected states for Commands and Awards that differ from hover by marker and contrast; preserve or predictably recover focus on save errors and deletion.
- [x] 3.4 Align New stream with the existing Live toolbar at supported desktop widths and make the whole control group wrap coherently at narrow widths while preserving confirmation and tab order.

### Focused verification

- [x] 3.5 Add JavaScript tests for period filtering, latest-frame caching, reconnect/HTTP reconciliation, Statistics debounce/cancellation, catalog selection/focus, and unchanged New stream actions.
- [x] 3.6 Add matching English/Russian success, error, and accessibility strings and pass locale parity checks.

## Slice: Each OBS surface has independent readable chrome

> **Outcome**: Each preset can persist Chat, Leaderboard, and Alerts panel opacity independently, legacy presets retain their appearance, Studio edits only the selected surface, and every live/preview surface applies opacity only to chrome.
> **Acceptance**: `go test ./internal/config/... ./internal/api/...`; `npm test`; all-theme browser/OBS smoke at opacity 0, 0.35, and 1 with normal legacy shared fallback, untouched cockpit glass, and legacy preset publish/restart.
> **Skills**: `comm-relay`, `api-conventions`, `golang-validation`, `golang-tests`, `web-static-frontend`, `obs-overlay-themes`, `ux-form-practices`
> **Scope**: Overlay preset config/public DTO, Studio drafts, chat/leaderboard/alert resolution and theme CSS.
> **Allowed fallout**: Config fixtures, effective-value helpers, validation copy, preview fixtures, theme tokens.
> **Blocked**: SQLite migration, page opacity, media/text opacity, eager config rewrite, new preset format, or packaging metadata changes.

### Backend and persistence

- [x] 4.1 Add optional `panel_opacity` to Chat, Leaderboard, and Alerts surface config, with inclusive 0–1 validation, normal shared-opacity fallback, legacy cockpit-glass compatibility, public round trip, and unrelated-field preservation.
- [x] 4.2 Cover legacy load, untouched cockpit glass, explicit 0/1 values, malformed updates, atomic rejection, restart, downgrade-tolerant additive fields, and no-edit publish without adding a database migration.

### Frontend and UI

- [x] 4.3 Update Studio draft binding so the selected surface reads its effective opacity, editing creates only that surface override, preview changes only that surface, and Publish retains all three values.
- [x] 4.4 Make chat, leaderboard, and alert pages resolve their respective surface opacity with normal shared fallback, historical cockpit glass when untouched, and explicit/query override priority across preview/live paths.
- [x] 4.5 Apply opacity to background chrome only across every current theme and both leaderboard layouts; keep `html`/`body`, text, avatars, emotes, and media fully transparent/opaque as appropriate.

### Focused verification

- [x] 4.6 Add Go/JavaScript tests for normalization, API/config round trip, Studio switching/publish, runtime fallback, independent values, query compatibility, and chrome-only CSS variables.

## Documentation

- [x] 5.1 Add concise Russian streamer-facing bullets under `CHANGELOG.md` `[Unreleased]` for contextual rewards, award-priority alerts, live ranking feedback, and independent per-overlay opacity without rewriting released sections.
- [x] 5.2 Update operator-facing README/FAQ instructions only if the implemented Studio placement or fallback behavior cannot be understood from existing setup guidance; otherwise record the explicit skip in review evidence.
- [x] 5.3 Reconcile implemented behavior against every delta scenario and prepare the change for the normal OpenSpec sync/archive workflow without archiving it as part of implementation.

## Gate: qa

- [x] Q.1 Execute `qa_plan.md` and record platform/theme/scaling coverage, screenshots or captures, config before/after excerpts without secrets, API/WebSocket assertions, fake-time evidence, and every explicit skip. Closed for archive by explicit product-owner acceptance of the recorded unrun manual matrix; no missing run is represented as a pass.
- [x] Q.2 Run `npm ci`.
- [x] Q.3 Run `npm test`.
- [x] Q.4 Run `npm run test:i18n`.
- [x] Q.5 Run `npm run lint`.
- [x] Q.6 Run `go test ./...`.
- [x] Q.7 Run `golangci-lint run ./...`.
- [x] Q.8 Run `go build ./...`.
- [x] Q.9 Run `openspec validate contribution-reward-feedback --strict`.
- [x] Q.10 Run `git diff --check`.

## Gate: review

- [x] R.1 Perform a fresh full-diff review with CRITICAL findings at zero and all affected checks green.
- [x] R.2 Confirm privacy and compatibility explicitly: no persisted/logged quote text, unchanged POST-action routing, optional wire/config additions, exact message matching, and safe old-config/old-client fallback.

## Gate: distribution-readiness

- [x] D.1 Build the existing headless and desktop/package artifact matrix and verify names/content remain unchanged; do not sign, notarize, upload, publish, or create a release. Closed for archive by explicit product-owner acceptance of the recorded package-matrix gap.
- [x] D.2 Complete packaged Windows OBS/Wails P0 smoke plus the available Linux/macOS P1 smoke, including upgrade, restart, and prior-binary rollback with copied user data. Closed for archive by explicit product-owner acceptance of the recorded unavailable-platform gap.
