## Why

Audience lists names without faces, so regulars are hard to recognize during and after a stream. Platform avatar URLs often arrive late or not at all (Twitch IRC never sends them; YouTube OAuth currently drops `ProfileImageUrl`), and OBS Browser Source frequently fails remote CDNs. A local image cache plus an operator-uploaded custom portrait (a consumer request) makes faces reliable. Independently, the leaderboard overlay has no heading, hard-codes a top-20, and cannot omit the streamer.

## Users and Supported Platforms

Stream operators on Windows/macOS/Linux (admin in browser or Wails). Viewers on Twitch, YouTube Live, and VK Live. OBS CEF loads `/overlay`, `/overlay/leaderboard`, and `/overlay/alert`. No new OS.

## What Changes

- Cache connector-provided avatar bytes beside `overlay-assets` and serve them locally. Fill empty `avatar_url` on chat, history, alerts, Live, and Audience from the canonical viewer.
- Map YouTube API `ProfileImageUrl` into the unified message.
- Operator uploads or clears a custom portrait on the viewer card; it overrides the cache. Settings can disable custom portraits globally (cache still used).
- Audience table and card show the resolved portrait with a deterministic fallback.
- Studio leaderboard surface: editable overlay title (blank hides the heading) and max visible ranks (default 5, 1–20). Optional URL `limit` override.
- Viewer card: hide from ranking. Hidden viewers stay in Audience; ranks recompute. Same snapshot feeds Live and OBS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `viewer-stats`: cache, custom portrait, `leaderboard_hidden`, resolved `avatar_url`.
- `admin-and-dock`: Audience portraits, upload/hide, custom-portrait setting.
- `obs-leaderboard`: title, max ranks, hidden viewers, cached/custom avatars.
- `obs-overlay`: empty chat avatars filled from the resolved viewer portrait.
- `overlay-alerts`: alert `avatar_url` uses the same resolution.
- `websocket-feed`: `avatar_url` may be a local `/overlay/assets/` URL.
- `http-api`: viewer avatar upload/clear; leaderboard honors limit.
- `config-store`: `custom_avatars_enabled`; preset title and `max_entries`.
- `platform-connectors`: YouTube OAuth/API author photo.

## Scope / Non-Goals

No viewer chat-command or URL self-service. No Twitch Helix lookup (Twitch-only faces stay empty until a custom upload or a merged YouTube/VK identity). No leaderboard show/hide modes (`!leaderboard`, interval, dock panel). No reuse of merge `hidden`. No public bind.

## Impact

SQLite columns, Goose migration, files in the config-dir assets folder, additive config/preset fields. POST-action uploads. SSRF-safe fetch of connector avatar URLs only. Streamer-visible: `CHANGELOG.md` `[Unreleased]`. Backup must copy assets with the DB. Installer names unchanged; OBS URLs unchanged.
