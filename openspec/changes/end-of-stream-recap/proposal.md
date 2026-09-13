## Why

CommRelay preserves per-session viewer totals and progression history but exposes only the current session and has no deliberate on-stream closing moment. Streamers need a manual, stable recap that fills the OBS canvas, remains independent from the constrained alert source, and can be reviewed later without resetting the session or retaining full chat text.

## Users and Supported Platforms

The change serves streamers and OBS operators using the local admin UI, Wails desktop, or headless server with Twitch, YouTube Live, and VK Live. Session attribution remains platform-neutral after connector normalization.

## What Changes

- Make stream sessions first-class history records by attributing live interaction events and achievement unlocks to the open session and exposing bounded session summaries/details.
- Capture one immutable recap snapshot for the current session when the operator confirms Show recap; repeated show uses that snapshot and never starts or resets a session.
- Add a dedicated transparent `/overlay/recap` Browser Source with server-authoritative show/hide state, reconnect recovery, active/pinned preset theming, and every existing overlay theme.
- Add Live controls, a compact session-history dialog, Studio preview, and OBS setup/copy affordances for the recap surface.

## Capabilities

### New Capabilities
- `stream-recaps`: Session attribution, history, immutable recap snapshots, content selection, and manual visibility lifecycle.
- `obs-recap`: Dedicated full-canvas recap Browser Source rendering and reconnect behavior.

### Modified Capabilities
- `viewer-stats`: Historical session summaries and details.
- `interaction-events`: Authoritative session attribution for live facts.
- `viewer-progression`: Authoritative session attribution for live achievement unlocks.
- `admin-and-dock`: Recap controls, history dialog, Studio preview, and OBS setup.
- `http-api`: Session-history and recap read/action endpoints.
- `websocket-feed`: Recap visibility snapshots and transitions.
- `config-store`: Optional recap surface appearance within overlay presets.

## Scope / Non-Goals

The change does not auto-detect stream end, reset sessions, archive full chat, grant final-rank MVP, add charts/export/deletion, replay old recaps on air, or alter alert/leaderboard visibility. Historical attribution is best-effort only when existing timestamps map unambiguously; administrative backfill unlocks remain sessionless.

## Impact

The Go store/API/hub, additive SQLite migrations, admin and Studio UI, embedded static assets, localization, documentation, diagnostics, and tests change. Data remains local; existing URLs and clients stay compatible. No connector permissions, cloud services, OS APIs, installer mechanics, or network exposure change; release artifacts merely include the new embedded page.
