## Why

OBS settings were built for one on-stream rectangle. The leaderboard is a third copy-URL card with no preview and a one-off gold skin, so it cannot follow chat themes. A fourth card for banners would overflow the Connection grid. Streamers need one studio for every Browser Source that belongs on the scene.

## What Changes

- Replace the OBS Connection card grid with a source list: chat overlay, leaderboard, message dock. Banners/`/overlay/alert` appear as a disabled placeholder only.
- Treat Appearance as a surface studio: one preset and theme for the scene, a Chat / Leaderboard switch, and the existing preview chrome (size, backdrop, replay) pointed at the selected surface.
- Apply overlay themes to the leaderboard as the same visual language (tokens and chrome), not a separate CSS look. Persist per-surface `font_size_px`. Persist leaderboard layout `panel` or `chips` (default `panel`) so the mapping for popup themes can be tried in the studio.
- Leaderboard URLs honor `preset` (and valid appearance overrides). Preview uses a fictitious top-5 (`preview=sample`), never live viewer stats.
- Extend the `obs-overlay-themes` skill so a theme covers every on-stream surface and a new surface implements every theme.
- Chat `/overlay` behavior, the messages dock look, and chat commands stay out of this change.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `admin-and-dock`: OBS dialog becomes a source list plus a multi-surface appearance studio with leaderboard preview
- `obs-overlay`: a theme is the scene visual language shared by on-stream surfaces; preview can target more than chat
- `obs-leaderboard`: ranking page follows preset/theme, sample preview, per-surface font and layout (depends on in-progress `viewer-stats-and-leaderboard`)
- `config-store`: overlay presets store optional per-surface overrides (`font_size_px`, leaderboard `layout`)

## Impact

Admin OBS HTML/CSS/JS (`obs-setup`, overlay preview/appearance), `web/leaderboard` CSS/JS and preview query, overlay preset JSON in `internal/config`, i18n, README, CHANGELOG. Agent skill `obs-overlay-themes`. No new runtime dependencies. Dock stays operator chrome and unthemed. Alerts are not implemented.
