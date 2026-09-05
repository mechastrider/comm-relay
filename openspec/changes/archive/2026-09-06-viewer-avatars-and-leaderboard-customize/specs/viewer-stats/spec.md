## ADDED Requirements

### Requirement: Canonical viewers expose a resolved portrait
`GET /api/viewers` and `GET /api/viewers/get` SHALL include `avatar_url` as the resolved portrait for that canonical viewer. Resolution SHALL be: custom overlay-asset URL when custom portraits are enabled and a custom file is stored; otherwise a locally cached platform portrait URL when a cache file exists; otherwise the last-seen identity remote `avatar_url` when present; otherwise the field SHALL be omitted. `GET /api/viewers/get` SHALL also include `custom_avatar` as the stored filename or omit it, and `leaderboard_hidden` as a boolean defaulting to false. List payloads MUST still omit `identities`.

#### Scenario: Cached platform portrait on the list
- **WHEN** a viewer has no custom portrait and a cached platform image filename is stored
- **THEN** `GET /api/viewers` includes `avatar_url` pointing at `/overlay/assets/{filename}` for that viewer

#### Scenario: Custom portrait overrides cache
- **WHEN** custom portraits are enabled and the viewer has a stored `custom_avatar`
- **THEN** list and card `avatar_url` use that custom file even if a platform cache file exists

#### Scenario: Custom portraits disabled
- **WHEN** `custom_avatars_enabled` is false and the viewer has a custom file plus a platform cache
- **THEN** resolved `avatar_url` uses the platform cache, not the custom file

### Requirement: Operator can upload and clear a custom portrait
`POST /api/viewers/avatar/upload` SHALL accept multipart form fields `id` (canonical viewer id) and `file`. On success it SHALL store a generated overlay-asset filename on that viewer, replace any previous custom file that is no longer referenced, and return `{"updated":true,"filename":"<stored name>"}`. `POST /api/viewers/avatar/clear` SHALL accept JSON `id`, remove the custom association, and return `{"updated":true}`. Clearing MUST NOT delete a file still referenced as a platform cache or by another viewer. Unknown viewer ids SHALL return HTTP 404. Upload validation SHALL match overlay-asset `kind` `viewer_avatar`.

#### Scenario: Upload PNG
- **WHEN** the operator uploads a PNG under the viewer-avatar size limit for a known viewer
- **THEN** later list, card, leaderboard, alert, and chat fills use `/overlay/assets/{filename}` while custom portraits are enabled

#### Scenario: Clear custom
- **WHEN** the operator clears a custom portrait
- **THEN** resolved `avatar_url` falls back to cache or last-seen remote URL

### Requirement: Operator can hide a viewer from rankings
`POST /api/viewers/update` SHALL accept optional JSON `leaderboard_hidden` as a boolean in addition to optional `display_name`. When true, that canonical viewer MUST be omitted from `GET /api/leaderboard` and `leaderboard` WebSocket snapshots for every period, and remaining rows SHALL be re-ranked from 1. Hidden viewers MUST remain in `GET /api/viewers` and the Audience directory. Merge-source `hidden` viewers stay excluded from both lists as today.

#### Scenario: Hide streamer
- **WHEN** the operator sets `leaderboard_hidden` true on the viewer who currently ranks 1
- **THEN** that viewer is absent from the next leaderboard snapshot and the previous rank 2 becomes rank 1

#### Scenario: Hidden viewer stays in Audience
- **WHEN** a viewer is leaderboard-hidden
- **THEN** `GET /api/viewers` still includes that viewer with `leaderboard_hidden` true

### Requirement: Platform avatar URLs are cached locally
When an ingested identity has a non-empty remote `avatar_url`, the system SHALL attempt to download that image into the overlay-assets directory and record the stored filename on that identity. Only connector-supplied avatar URLs SHALL be fetched, never URLs from chat text. Fetches MUST use HTTPS, reject loopback and private destinations, cap size, sniff PNG/JPEG/WebP, and MUST NOT follow redirects onto private addresses. Fetch failure MUST leave the remote URL in place and MUST NOT fail chat ingest. Subsequent resolution SHALL prefer the cached file over the remote URL.

#### Scenario: YouTube photo arrives
- **WHEN** a counted YouTube line includes a profile image URL
- **THEN** after a successful cache write, later list and overlay payloads use the local `/overlay/assets/{filename}` for that viewer

#### Scenario: Cache miss does not drop chat
- **WHEN** the remote avatar host times out
- **THEN** the chat line is still stored and broadcast, and `avatar_url` may remain the remote URL
