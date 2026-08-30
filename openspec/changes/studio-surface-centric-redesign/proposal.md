## Why

Studio currently shows two unsynchronized selectors (OBS source list vs appearance surface tabs), two preset controls (hot active vs draft edit), and every appearance field beside first-run URL copy. New operators meet OBS connection, theme engineering, and multi-scene pinning at once. Power users still need those controls, but they should not occupy the first screen.

## Users and Supported Platforms

Primary user: a streamer or OBS operator on the local admin (`/` in the Wails shell or an external browser). The change covers Windows, macOS, and Linux; clipboard fallback in webviews stays as today. Overlay, leaderboard, alert, and dock URLs are unchanged.

## What Changes

- Treat Studio as one selected **on-stream surface** (chat, leaderboard, alerts). That selection drives preview, inspector fields, and the primary copy URL.
- Make preview the dominant pane. Put Replay and Follow-active copy on the canvas chrome. Move preview size, backdrop, sample/live, and pinned URLs behind a compact overflow.
- Reveal appearance in layers: theme gallery + font size + message duration first; remaining current fields stay reachable under More / Advanced. Do not remove customization.
- Show a dismissible **Add to OBS** sheet on first Studio visit (chat Browser Source steps + copy). Leaderboard, alerts, and the operator-only message dock live in that sheet, not as a permanent third of the screen equal to themed surfaces.
- Keep draft-until-Publish. Remove the Studio toolbar **Active preset** hot control; Live keeps it. When the edited look is not on air, Studio offers **Use on stream**. Collapse preset CRUD while only one look exists.
- Own Studio markup instead of transplanting the leftover OBS dialog panels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-and-dock`: surface-centric Studio, layered inspector, Add to OBS sheet, Live-only hot preset switch
- `admin-design-system`: preview-first Studio layout, progressive disclosure, constrained-height inspector
- `obs-overlay`: primary Follow-active copy stays on the selected surface; pinned copy remains advanced

## Scope / Non-Goals

No new overlay themes, no change to overlay/leaderboard/alert rendering, URL query contracts, `POST /api/config/update`, `POST /api/overlay/activate`, or `config.json` schema. No React. Settings → Platforms onboarding stays outside Studio. No claim that a WebSocket client means an OBS scene is visible.

## Impact

Static admin HTML/CSS/JS under `web/admin/`, locale catalogs, README/FAQ Studio steps, `[Unreleased]` changelog. Same localhost security, packaging, and overlay assets. Operators must relearn where copy, pinned URLs, and Activate live; existing OBS sources keep working.
