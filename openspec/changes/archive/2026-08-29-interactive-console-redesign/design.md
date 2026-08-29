## Context

The current admin page grew around a chat monitor and modal settings. It now also owns viewer identity, leaderboards, OBS surface presets, diagnostics, and data maintenance. The approved redesign changes the information architecture without changing the local-process deployment, connector model, overlay rendering model, or persistence technologies.

The production UI must preserve every implemented workflow from the current admin and the active viewer-statistics and OBS-surface changes. The standalone HTML mockup is a direction reference, not a source of runtime behavior: mock-only commands, splash controls, queue actions, and historical charts are not implementation requirements.

## Goals / Non-Goals

**Goals**

- Organize the admin around Live, Audience, Studio, and Settings workspaces.
- Make save semantics legible: hot actions apply immediately, Studio edits remain drafts until Publish, and cold settings use explicit Save actions.
- Establish a reusable token and component foundation instead of page-specific styling.
- Preserve current API behavior, data, secrets, OBS URLs, localization, accessibility, and Wails/headless parity.
- Let the default OBS source URL follow the active preset without rewriting an existing Browser Source.

**Non-Goals**

- Viewer-command or splash-message administration, a functional Interactions workspace, or alert overlays.
- OBS WebSocket integration, scene visibility detection, or remote OBS control.
- New historical analytics, event schemas, connector behavior, or database tables.
- Overlay theme visual redesign, React or another frontend framework, or native Wails-shell work.

## Component / Process / IPC Boundaries

The Go process remains the only trusted runtime. It serves the admin, overlays, dock, JSON API, and WebSocket exactly as today. Wails and a standalone browser load the same `/` document.

The admin remains a single static application. `web/admin/index.html` owns landmarks and workspace containers; JavaScript modules own API access, shared state, navigation, and workspace controllers. Existing domain modules for viewers, presets, connections, and diagnostics are retained or extracted instead of duplicated.

Styles are split by responsibility:

- `styles/primitives.css`: raw color, type, spacing, radius, shadow, and motion scales.
- `styles/tokens.css`: semantic roles for surfaces, text, borders, status, focus, and density.
- `styles/components.css`: buttons, icon buttons, tabs, fields, tables, badges, notices, dialogs, and toasts.
- `styles/shell.css`: sidebar, header, workspace, inspector, and responsive layout.
- `styles/utilities.css`: small accessibility and layout helpers only.

Component CSS consumes semantic or component tokens; workspace CSS MUST NOT introduce a parallel palette. Existing Lucide-compatible inline icon use remains dependency-free and every icon-only control has an accessible name and tooltip.

The only new server boundary is `POST /api/overlay/activate` with body `{"preset_id":"<id>"}`. It validates the referenced preset, atomically mutates only `overlay.active_preset_id`, returns the public config representation, and emits the existing `overlay_settings` WebSocket event. The full `POST /api/config/update` remains the publication path for Studio drafts and explicit Settings saves.

## State and Event Flow

On startup the shell concurrently loads public config, connector status, diagnostics, recent messages, viewers, and leaderboard data as required by the visible workspace. Failures are isolated per resource and represented inline with retry; one failed panel does not blank the shell.

Hash routes `#live`, `#audience`, `#studio`, and `#settings` are client-side state only. Unknown or absent hashes resolve to Live. Browser history navigation restores the workspace. Local UI state such as active tabs, filters, preview backdrop, and pane widths is not persisted in `config.json` unless it is already a product setting.

Live consumes recent messages and `/ws` events. Message deletion continues to wait for `message_deleted`. Audience uses the existing viewer and leaderboard APIs. Studio maintains a deep-cloned draft derived from the latest public config; preview reads the draft, while Publish submits the complete latest config with the draft overlay section. A server refresh or successful Publish replaces the baseline. Leaving Studio with a dirty draft asks for confirmation.

Selecting the active preset is a hot action independent of the Studio draft. Success updates shared client state and all active-preset indicators; failure restores the previous selection and shows an actionable error. The shell labels WebSocket clients as connected browser clients, never as proof that a source is visible in OBS.

## Threading / Async / Cancellation

Frontend requests use `AbortController` per workspace load and ignore stale responses after route changes. Repeated hot actions are serialized or disable their initiating control until completion. Polling and reconnect loops keep their existing bounded cadence and stop when the page unloads.

The config store mutation runs under its existing lock and writes through the established atomic persistence path. The activation handler does not start a new goroutine and respects request cancellation. WebSocket broadcast remains best-effort after persistence, matching existing config updates.

## Security and Trust Boundaries

The redesign does not expand the localhost trust model. Secrets remain omitted from public config responses, blank secret inputs retain stored values, and rendered chat/viewer strings use text nodes. Hash values and query parameters are treated as untrusted enumerations, not HTML or file paths. Copyable URLs are constructed with URL APIs and never include OAuth credentials.

Uploaded overlay assets keep existing size, type, and filename checks. The new activation action accepts only a preset identifier already present in validated configuration. No external CDN, telemetry, font request, or frontend package is added.

## Decisions and Alternatives

### Decision: Use task workspaces in one static shell

The admin will use persistent navigation with Live, Audience, Studio, and Settings. This matches operator intent while preserving the single-binary static architecture. Separate server-rendered pages were rejected because they would duplicate shared live state and navigation; a SPA framework was rejected because current complexity does not justify a new runtime and build pipeline.

### Decision: Do not ship an empty Interactions destination

The shell reserves an extension point in its navigation model, but Interactions is not shown as an enabled workspace until commands or splash tools exist. A disabled primary destination was rejected because it implies product capability without a usable workflow.

### Decision: Make persistence boundaries visible

Hot preset activation is immediate, Studio is draft-and-Publish, and cold Settings forms save explicitly. A global Save was rejected because it obscures which live output will change; autosaving every field was rejected because appearance editing needs reversible preview.

### Decision: Add a narrow activation endpoint

Active-preset changes use a targeted POST action rather than resubmitting a stale full config. This prevents hot actions from overwriting concurrent connection or settings changes. General partial-config patch semantics were rejected as broader than this redesign requires.

### Decision: Prefer stable default OBS URLs

The primary copied overlay and leaderboard URLs omit `preset`, so they follow `active_preset_id`. An advanced pinned option retains `preset=<id>` for scene-specific output and all existing pinned URLs continue working. Automatically rewriting OBS configuration was rejected because CommRelay does not own OBS scene data.

### Decision: Derive statistics from current data only

Live statistics use existing current-session viewer and leaderboard data. The UI will not present mock historical charts that the backend cannot substantiate. A new event/time-series store is deferred to a separate product change.

## Risks / Trade-offs

- Splitting the current large admin document can regress mature connection and preset flows. Workspace migration is incremental and verified against a feature inventory.
- A full-config Publish can collide with a concurrent cold-settings save. The client refreshes the latest public config before composing Publish and replaces only the overlay section; the targeted activation endpoint removes the most frequent hot-action collision.
- Hash navigation is simpler than a router but cannot provide independent server URLs. This is acceptable for a local single-document console and Wails webview.
- Stable unpinned URLs change the default copy action, so operators may switch output unintentionally if labels are unclear. The UI identifies Follow active preset versus Pinned preset before copying.
- Dense tables and split panes can fail in compact Wails windows. The responsive contract collapses inspectors into in-flow sections and uses a bottom navigation on narrow screens.

## Migration / Rollout / Rollback

No config or database migration runs. Existing preset IDs, `active_preset_id`, source URLs, viewer data, and secrets are read unchanged. Existing URLs containing `preset` remain pinned; URLs without it retain their current active-preset behavior.

Implementation proceeds foundation-first: tokens/components, shell/navigation, Live and Audience migration, Studio draft/publish, Settings migration, then source-copy defaults. Each stage keeps current server routes available. Rollback consists of restoring the previous static admin assets and removing the new route; persisted files remain compatible because no schema is added.

## Open Questions

None blocking. The reserved Interactions workspace and historical analytics require separate proposals once their domain contracts are defined.
