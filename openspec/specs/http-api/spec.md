# HTTP API

## Purpose

Exposes a localhost JSON API and static pages using POST-action mutations, snake_case fields, and admin-safe error bodies.

## Requirements

### Requirement: Mutations use POST-action routes
API mutations SHALL use `POST /api/<resource>/<action>` with identifiers in the JSON body or multipart form. The API MUST NOT use `PUT`, `DELETE`, or `PATCH`, and MUST NOT put `{id}` path parameters under `/api/`.

#### Scenario: Config save
- **WHEN** the admin saves settings
- **THEN** the client calls `POST /api/config/update`

#### Scenario: Message delete
- **WHEN** the operator deletes a chat line
- **THEN** the client calls `POST /api/messages/delete` with `platform` and `id` in the JSON body

#### Scenario: Viewer merge
- **WHEN** the operator merges two viewers
- **THEN** the client calls `POST /api/viewers/merge` with `from_id` and `into_id` in the JSON body

#### Scenario: New stream session
- **WHEN** the operator starts a new stream
- **THEN** the client calls `POST /api/sessions/start`

#### Scenario: Create command
- **WHEN** the operator saves a new chat command
- **THEN** the client calls `POST /api/commands/create`

#### Scenario: Grant award
- **WHEN** the operator rewards a viewer from a message
- **THEN** the client calls `POST /api/awards/grant` with `platform`, `user_id`, and `award_id` in the JSON body

#### Scenario: Custom portrait upload
- **WHEN** the operator attaches a custom portrait on a viewer card
- **THEN** the client calls `POST /api/viewers/avatar/upload` with multipart `id` and `file`

#### Scenario: Clear custom portrait
- **WHEN** the operator removes a custom portrait
- **THEN** the client calls `POST /api/viewers/avatar/clear` with JSON `id`

### Requirement: Reads, health, static, WebSocket, and OAuth callbacks may use GET
The following GET routes SHALL remain available: `/`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/api/viewers`, `/api/viewers/get`, `/api/leaderboard`, `/api/commands`, `/api/awards`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: Status poll
- **WHEN** the admin polls connector state
- **THEN** it uses `GET /api/status`

#### Scenario: Leaderboard snapshot
- **WHEN** the leaderboard page loads
- **THEN** it uses `GET /api/leaderboard` with a `period` query

#### Scenario: List commands
- **WHEN** the Audience commands view loads
- **THEN** it uses `GET /api/commands`

#### Scenario: Alert page
- **WHEN** OBS loads the banners Browser Source
- **THEN** it uses `GET /overlay/alert`

### Requirement: JSON uses snake_case
Request and response objects SHALL use snake_case field names (`server_port`, `display_name`, `avatar_url`, `max_messages`).

#### Scenario: Public config
- **WHEN** a client reads `GET /api/config`
- **THEN** overlay limits appear as `max_messages` and `message_ttl_seconds`

### Requirement: Errors are UI-safe JSON
Generic failures SHALL return `{"error":"<short message>"}`. Config validation failures SHALL return HTTP 400 with `error` plus a `fields` map of form keys to messages. Unexpected internal errors SHALL return HTTP 500 without leaking secrets.

#### Scenario: Invalid JSON body
- **WHEN** `POST /api/config/update` receives malformed JSON
- **THEN** the response is 400 with `{"error":"invalid JSON"}`

#### Scenario: Field validation
- **WHEN** `POST /api/config/update` fails overlay font-size bounds
- **THEN** the response is 400 and `fields` includes `overlay_font_size_px`

### Requirement: Overlay assets upload is bounded and type-checked
`POST /api/overlay/assets/upload` SHALL accept a multipart `file` and optional form field `kind` of `panel` (default), `alert_image`, `alert_sound`, or `viewer_avatar`. Panel uploads SHALL keep the existing 512 KiB limit, reject HEIC/AVIF and unsafe SVG, and return `{"filename":"<stored name>"}` on success. `kind` `alert_image` SHALL accept static PNG, JPEG, or WebP up to 4 MiB, reject SVG, GIF, HEIC/AVIF, and animated WebP, and reject images whose decoded pixel count exceeds 16 megapixels or whose longest side exceeds 4096 px. `kind` `alert_sound` SHALL accept MP3 or WAV up to 5 MiB whose decoded duration is 1–15 seconds, reject other types, and reject looping metadata as a reason to fail closed if duration cannot be determined. `kind` `viewer_avatar` SHALL accept static PNG, JPEG, or WebP up to 512 KiB, reject SVG, GIF, HEIC/AVIF, and animated WebP, and reject images whose longest side exceeds 1024 px. `POST /api/viewers/avatar/upload` SHALL apply the same `viewer_avatar` rules. `GET /overlay/assets/{filename}` SHALL serve only stored names that pass the asset-name safety check, including audio and cached portraits. Type SHALL be detected from content, not only the filename extension.

#### Scenario: PNG panel image
- **WHEN** the admin uploads a PNG under the panel size limit
- **THEN** the response is 200 with a generated `filename`

#### Scenario: HEIC upload
- **WHEN** the admin uploads a HEIC image
- **THEN** the response is 400 explaining that PNG or JPEG is required

#### Scenario: Alert PNG
- **WHEN** the admin uploads a PNG as `kind` `alert_image` under 4 MiB
- **THEN** the response is 200 with a generated `filename`

#### Scenario: Alert GIF rejected
- **WHEN** the admin uploads a GIF as `kind` `alert_image`
- **THEN** the response is 400 and no file is stored

#### Scenario: Alert MP3
- **WHEN** the admin uploads a 3-second MP3 as `kind` `alert_sound`
- **THEN** the response is 200 with a generated `filename`

#### Scenario: Viewer avatar GIF rejected
- **WHEN** `POST /api/viewers/avatar/upload` receives a GIF
- **THEN** the response is 400 and no custom portrait is stored

### Requirement: Unreferenced overlay assets may be deleted
`POST /api/overlay/assets/delete` SHALL accept JSON `filename`. The system SHALL delete the file only when no overlay preset panel image, command `image_asset`/`sound_file`, or award `image_asset`/`sound_file` references it. A referenced filename SHALL fail with HTTP 400. Unknown safe names SHALL fail with HTTP 404 or 400 without deleting other files.

#### Scenario: In-use image
- **WHEN** command `gg` references `asset_ab.png` and the operator deletes that filename
- **THEN** the file remains and the request fails with a field or error message that it is in use

### Requirement: Active overlay preset has a targeted action
`POST /api/overlay/activate` SHALL accept JSON body `{"preset_id":"<id>"}`, activate an existing preset without requiring a full config payload, and return the updated public config representation. A successful action MUST broadcast the existing `overlay_settings` event so unpinned overlays and other admin clients update.

#### Scenario: Successful activation
- **WHEN** the request names an existing preset
- **THEN** the response is HTTP 200 with public config JSON, secrets are omitted, and connected WebSocket clients receive `overlay_settings`

#### Scenario: Missing preset identifier
- **WHEN** the request omits `preset_id` or sends it blank
- **THEN** the response is HTTP 400 with a UI-safe error and configuration remains unchanged

#### Scenario: Unknown preset identifier
- **WHEN** the request names a preset that does not exist
- **THEN** the response is HTTP 400 with a UI-safe error and configuration remains unchanged

#### Scenario: Malformed activation JSON
- **WHEN** the request body is not valid JSON
- **THEN** the response is HTTP 400 with `{"error":"invalid JSON"}`

### Requirement: Viewer portrait files count as overlay-asset references
`POST /api/overlay/assets/delete` SHALL treat `viewers.custom_avatar` and `viewer_identities.avatar_cache` filenames as in-use references, in addition to preset panel images and catalog `image_asset`/`sound_file`. Deleting an in-use portrait filename SHALL fail with HTTP 400 and MUST NOT remove the file.

#### Scenario: Cached portrait in use
- **WHEN** an identity `avatar_cache` is `asset_ab.png` and the operator deletes that filename
- **THEN** the file remains and the request fails as in use
