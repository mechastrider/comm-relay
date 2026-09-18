## Why

Operators want a contribution award for a *timely interactive command* (heat on shutdown, fahadarm on a broken arm) so viewers are paid for using commands, not for chat volume. Commands still must not grant XP. They also need a one-click Streamer Like on `/dock/messages` (and Live): opening the full picker for the 5-point like is too slow, and success feedback currently wraps the action row so Reward/Delete jump.

## Users and Supported Platforms

Local streamers and OBS operators on existing Windows desktop and headless server. Viewers stay on current Twitch, YouTube Live, and VK Live ingest. No new OS, connector, or installer surface.

## What Changes

- Deletable starter award `on_point` (20 XP): RU **В точку**, EN **On Point**, splash `В точку: {viewer}! +{points}` / `On Point: {viewer}! +{points}`, `ping` sound, 5000 ms. Manual `POST /api/awards/grant` only; any identified chat line (not limited to `is_command`).
- One-time insert-if-absent on existing databases; do not rewrite an existing `on_point` row; do not recreate after operator delete.
- Deletable one-time achievement `achievement_on_point` (**Синхрон** / **In Sync**): 10 grants of `on_point`. Same insert-if-absent rules. Global achievement alerts stay independently gated (default off).
- Live Messages and `/dock/messages`: icon Streamer Like grants catalog `like` in one click when that id exists; the picker omits `like`. Grant success/error MUST NOT reflow Reward/Delete.

## Capabilities

### New Capabilities

- None. No new spec slug.

### Modified Capabilities

- `operator-rewards`: starter `on_point`; upgrade insert-if-absent; picker vs quick-like split.
- `viewer-progression`: starter achievement Синхрон / In Sync.
- `admin-and-dock`: Like icon, picker without `like`, stable action-row layout after grant.

## Scope / Non-Goals

Not in scope: auto-grant on command fire; situation windows / rules engine; game telemetry; a second quick button for `on_point`; pinning picker order; restricting grants to `is_command`; viewer `!like` / `viewer_like`; XP from commands; overlay operator controls; new HTTP routes; Credits; Community Awards.

## Impact

SQLite catalog rows via a one-time bootstrap marker (no new tables). Shared `web/shared/reward-picker.js` for Live and dock; RU/EN copy; tests; streamer-visible `[Unreleased]` changelog. Localhost boundary unchanged. Older binaries ignore unknown award/achievement ids.
