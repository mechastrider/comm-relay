# Implementation Slices

## Backend

### Slice: `Atomic live preset activation`

> **Outcome**: An operator can change the active preset immediately without resubmitting or overwriting unrelated configuration.
> **Acceptance**: `go test ./internal/config ./internal/api` plus valid/invalid `curl` smoke against `POST /api/overlay/activate`.
> **Skills**: `comm-relay`, `backend-structure`, `api-conventions`, `comm-relay-backend-golang`, `golang-errors`, `golang-tests`
> **Scope**: Config mutation, HTTP action, public response, WebSocket broadcast, route registration.
> **Allowed fallout**: Focused DTO/error helpers, handler/config tests, API fixtures.
> **Blocked**: General PATCH semantics, config revisions, connector changes, database migrations.

- [x] 1.1 Add a config-store operation that validates a preset ID and atomically changes only `overlay.active_preset_id` through the existing locked persistence path.
- [x] 1.2 Cover valid, blank, unknown, secret-bearing, and forced-write-failure mutations; deep-compare all unrelated config fields.
- [x] 1.3 Add `POST /api/overlay/activate` with snake_case request parsing, UI-safe 400/500 errors, and the public config response.
- [x] 1.4 Broadcast the existing `overlay_settings` event after successful persistence and add handler tests for success, validation, malformed JSON, secret omission, and no broadcast on failure.
- [x] 1.5 Extend router/API guard coverage and smoke the action with two concurrent admin/WebSocket clients.

## Frontend

### Slice: `Design-system foundation and navigable shell`

> **Outcome**: The existing admin loads in an accessible, responsive four-workspace shell with shared visual/state primitives.
> **Acceptance**: `npm run lint && npm test`; keyboard/hash-navigation smoke at 1440x900, 1100x700, and 390x844.
> **Skills**: `web-static-frontend`, `design-system`, `ui-styling`, `web-constrained-layout`
> **Scope**: Admin HTML landmarks, layered CSS, hash router, navigation, shared components/states, responsive shell.
> **Allowed fallout**: Extraction of existing styles and pure UI helpers, locale keys, static-serving tests.
> **Blocked**: React/framework adoption, remote assets, overlay theme redesign, enabled Interactions destination.

- [x] 2.1 Inventory every current admin entry point, control, dialog, locale key, and API call; map each to Live, Audience, Studio, Settings, or retained dock before moving markup.
- [x] 2.2 Establish primitive, semantic, and component tokens, then migrate buttons, icon buttons, fields, tabs, tables, badges, notices, dialogs, toasts, focus, and reduced-motion states to shared CSS.
- [x] 2.3 Build the semantic shell landmarks and hash router for `#live`, `#audience`, `#studio`, and `#settings`, including unknown-route fallback, active navigation, history restoration, and heading focus.
- [x] 2.4 Implement persistent desktop navigation, compact stacked layout, narrow bottom navigation, content offsets, constrained panel scrolling, and stable preview/table/control dimensions.
- [x] 2.5 Add shared loading, stale, empty, scoped error/retry, busy, dirty, success, and failure patterns with accessible live announcements.
- [x] 2.6 Update Russian/English shell and component catalogs and add locale-parity plus route/helper unit tests.
- [x] 2.7 Smoke keyboard, 200% zoom, long labels, reduced motion, short viewport, and icon accessible names before migrating domain workspaces.

### Slice: `Live operations replace the chat cockpit`

> **Outcome**: The default workspace combines operational status with switchable Messages, Leaderboard, and supported current Statistics without losing moderation behavior.
> **Acceptance**: `npm run lint && npm test`; browser smoke with message, viewer, leaderboard, WebSocket failure, and connector fixtures.
> **Skills**: `comm-relay`, `web-static-frontend`, `design-system`, `ui-styling`
> **Scope**: Live workspace, current messages/status modules, leaderboard/viewer reads, active-preset hot control.
> **Allowed fallout**: Pure aggregate selectors, fixtures, locale keys, scoped CSS.
> **Blocked**: Historical time series, clear-queue action, OBS scene visibility, commands or splash controls.

- [x] 3.1 Move current status and message monitoring into Live while preserving recent history, manual-scroll behavior, optional sound, stable-ID deletion, and reconnect semantics.
- [x] 3.2 Add accessible Messages, Leaderboard, and Statistics tabs with a stable content region and independently recoverable loads.
- [x] 3.3 Render leaderboard and current aggregate statistics from existing session/day/all viewer data; cover zero, populated, tied, and partial-data fixtures without synthetic history.
- [x] 3.4 Wire active-preset selection to the targeted activation action with serialized progress, optimistic-selection rollback, shared-state update, and feedback.
- [x] 3.5 Present connector health and WebSocket browser-client counts with truthful labels; retain diagnostics access without claiming OBS scene visibility.
- [x] 3.6 Verify RU/EN copy, keyboard tab behavior, message moderation, live updates, region-level failures, and compact layouts.

### Slice: `Audience workspace preserves viewer management`

> **Outcome**: Operators can search, inspect, merge, rank, and start a new stream from one dense audience workspace.
> **Acceptance**: Existing viewer/leaderboard API tests plus `npm run lint && npm test`; browser smoke for zero, populated, search, detail, merge, and reset states.
> **Skills**: `comm-relay`, `web-static-frontend`, `design-system`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: Existing viewers UI and APIs, detail inspector, merge flow, period controls, New stream.
> **Allowed fallout**: Viewer module extraction, search helper tests, locale keys and responsive styles.
> **Blocked**: New viewer metrics, schema changes, bulk moderation, data export.

- [x] 4.1 Move the existing viewer list, filters, period selection, leaderboard access, and New stream action into Audience without duplicating state or requests.
- [x] 4.2 Rebuild viewer detail as a wide side inspector and compact in-flow sheet/dialog with correct loading, focus restoration, scroll containment, and close behavior.
- [x] 4.3 Preserve edit and merge validation, confirmations, mutation progress, error retention, and refresh of the affected list/detail/leaderboard state.
- [x] 4.4 Distinguish no viewers, no search matches, loading, stale, failure, and recovered states while retaining the operator's search/filter context.
- [x] 4.5 Verify keyboard table navigation/actions, 200% zoom, long platform identities, RU/EN copy, and current viewer API regression coverage.

### Slice: `Studio makes preparation explicit`

> **Outcome**: Operators edit and preview OBS surface presets locally, Publish intentionally, activate presets immediately, and copy clearly scoped source URLs.
> **Acceptance**: Existing overlay/preset tests plus `npm run lint && npm test`; browser and OBS smoke for draft/publish, assets, active/pinned sources, and dirty navigation.
> **Skills**: `comm-relay`, `obs-overlay-themes`, `web-static-frontend`, `design-system`, `ux-form-practices`, `web-constrained-layout`
> **Scope**: Existing preset/source/preview modules, Studio layout and draft ownership, chat/leaderboard/dock URL setup.
> **Allowed fallout**: Pure draft/source URL modules and tests, preview plumbing, locale keys, admin-only CSS.
> **Blocked**: New overlay themes, alert surface, OBS WebSocket, automatic OBS configuration.

- [x] 5.1 Build the Studio surface list, stable-aspect preview, and property inspector using existing chat/leaderboard preview and preset-management behavior.
- [x] 5.2 Introduce an isolated overlay draft and baseline with deterministic dirty comparison; make appearance edits update preview only until Publish.
- [x] 5.3 Implement Publish by refreshing public config, replacing only its overlay section with the draft, submitting the full validated update, and retaining draft/field errors on failure.
- [x] 5.4 Add navigation/reload/close protection for dirty Studio drafts with Cancel preserving the workspace and confirmed discard restoring the baseline.
- [x] 5.5 Preserve add, duplicate, rename, delete, style controls, asset upload/removal, theme defaults, and shared preview backdrop behavior in the new inspector.
- [x] 5.6 Make unpinned Follow active preset URLs the primary chat/leaderboard copy actions; expose clearly labeled pinned alternatives and keep the dock URL behavior intact.
- [x] 5.7 Ensure unpinned chat and leaderboard pages react to activation broadcasts while valid pinned URLs remain fixed; add pure URL and resolution regression tests.
- [x] 5.8 Verify clipboard denial fallback, preview failure, publish validation, concurrent cold-save composition, RU/EN copy, short-window scrolling, and real OBS transparency/output.

### Slice: `Cold configuration moves to explicit Settings sections`

> **Outcome**: Platform, network, data, and application settings are findable, locally drafted, and saved without a global or ambiguous action.
> **Acceptance**: Existing config/OAuth/connector tests plus `npm run lint && npm test`; browser smoke for every section, validation, secrets, dirty navigation, and API loss.
> **Skills**: `comm-relay`, `web-static-frontend`, `ux-form-practices`, `web-constrained-layout`, `connector-oauth`
> **Scope**: Existing connection, proxy, language, sound, data, diagnostics, and about workflows.
> **Allowed fallout**: Settings controller extraction, form-state helpers/tests, locale keys, admin CSS.
> **Blocked**: New connector modes, credential storage changes, auto-save, one global Save.

- [x] 6.1 Move Twitch, YouTube, VK, proxy, interface, sound, data, diagnostics, and about controls into labeled Settings sections while preserving every existing conditional field and action.
- [x] 6.2 Give each editable section its own baseline, dirty state, reset/leave confirmation, and Save action; refresh public config and compose only the owned section before submit.
- [x] 6.3 Preserve OAuth starts/callback status, blank-secret semantics, connector restart behavior, validation field mapping, first-error focus, and entered values after failure.
- [x] 6.4 Keep diagnostics/about read-only actions distinct from forms and provide scoped refresh/copy failure states.
- [x] 6.5 Verify concurrent section saves, server reconnect, compact conditional forms, keyboard/screen-reader labeling, RU/EN catalogs, and the full feature-inventory mapping.

## Docs

### Slice: `Operator-facing transition documentation`

> **Outcome**: Operators understand the new navigation and which OBS URLs follow or pin presets without being promised deferred interaction features.
> **Acceptance**: Documentation link/term review against the implemented UI and release smoke.
> **Skills**: `changelog`, `comm-relay`
> **Scope**: Changelog `[Unreleased]`, README/FAQ setup text only where source copying changes, canonical spec synchronization at completion.
> **Allowed fallout**: Updated screenshots if maintained by the release process.
> **Blocked**: Release publication, version bump, marketing promises for commands/splash/OBS control.

- [ ] 7.1 Add concise Russian `[Unreleased]` bullets for task workspaces, hot/Publish/Save semantics, and Follow active preset default with pinned compatibility.
- [ ] 7.2 Update RU/EN OBS setup guidance only where the implemented copy flow and labels differ; retain platform-specific troubleshooting.
- [ ] 7.3 Reconcile the implementation with all delta specs and sync/archive the OpenSpec change only after verification is complete.

## Verification

### Gate: `Automated and browser QA`

- [ ] Q.1 Run `gofmt`/`goimports` on touched Go files and review `git diff --check` plus the complete diff for unrelated changes.
- [ ] Q.2 Run `go test ./...` and `go test -race ./...`.
- [ ] Q.3 Run `golangci-lint run ./...`.
- [ ] Q.4 Run `npm ci`, `npm run lint`, and `npm test`.
- [ ] Q.5 Run `go build ./...` and smoke `GET /health`, all admin routes/actions, `/ws`, `/overlay`, `/leaderboard`, and `/dock/messages` from a matching static-asset build.
- [ ] Q.6 Execute every P0 scenario in `qa_plan.md`; capture all workspaces at 1440x900, 1100x700, and 390x844, plus 200% zoom, reduced motion, keyboard, RU/EN, offline/recovery, and dirty-state evidence.
- [ ] Q.7 Smoke real OBS chat and leaderboard with transparent backgrounds, sample messages, unpinned activation updates, pinned stability, queue limits, and dock moderation.

### Gate: `Fresh review`

- [ ] R.1 Perform a fresh independent diff review against proposal, specs, design, UI, platform, persistence, and distribution contracts; resolve all critical/high findings and document residual risks.
- [ ] R.2 Repeat affected focused tests after review fixes and confirm the feature inventory has no lost workflow or enabled mock-only control.

### Gate: `Distribution readiness`

- [ ] D.1 Build or inspect Windows amd64, macOS universal, and Linux amd64 desktop packages; verify redesigned static assets are embedded and no loose-asset version mismatch exists.
- [ ] D.2 Execute upgrade/restart/downgrade smoke with existing `config.json`, `comm-relay.db`, assets, secrets, and pinned/unpinned OBS URLs; record actual platform coverage and explicit skips.
- [ ] D.3 Confirm release notes/support text, artifact names, compatibility statement, and rollback procedure without signing, notarizing, uploading, tagging, or publishing.
