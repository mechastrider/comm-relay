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
The following GET routes SHALL remain available: `/`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/overlay/recap`, `/overlay/test/chat`, `/overlay/test/leaderboard`, `/overlay/test/alert`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/ws/overlay-debug`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/api/viewers`, `/api/viewers/get`, `/api/sessions`, `/api/sessions/get`, `/api/stream-recaps/current`, `/api/leaderboard`, `/api/commands`, `/api/awards`, `/api/reward-history`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: Status poll
- **WHEN** the admin polls connector state
- **THEN** it uses `GET /api/status`

#### Scenario: Leaderboard snapshot
- **WHEN** the leaderboard page loads
- **THEN** it uses `GET /api/leaderboard` with a `period` query

#### Scenario: List commands
- **WHEN** the Audience commands view loads
- **THEN** it uses `GET /api/commands`

#### Scenario: Read reward history
- **WHEN** the Audience History tab or a viewer detail loads award history
- **THEN** it uses `GET /api/reward-history` with query parameters rather than an id path segment

#### Scenario: Alert page
- **WHEN** OBS loads the banners Browser Source
- **THEN** it uses `GET /overlay/alert`

#### Scenario: Dedicated test chat page
- **WHEN** OBS loads a Browser Source at `/overlay/test/chat`
- **THEN** the page is served over GET and uses only the debug WebSocket route

#### Scenario: Debug WebSocket upgrade
- **WHEN** a test overlay client upgrades `/ws/overlay-debug`
- **THEN** the connection is accepted separately from production `/ws`

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

### Requirement: Leaderboard visibility state is readable
`GET /api/leaderboard/visibility` SHALL return the same `state`, `policy`, `visible`, `visible_until`, and `reason` fields used by the WebSocket visibility envelope.

#### Scenario: Dock recovery read
- **WHEN** the dock loads or reconnects while the board is timed
- **THEN** the read returns its current absolute deadline

### Requirement: Leaderboard visibility mutations use POST actions
The API SHALL provide `POST /api/leaderboard/show`, `/api/leaderboard/hide`, `/api/leaderboard/pin`, and `/api/leaderboard/resume`. Show MAY accept `duration_seconds`; omitted duration SHALL use config and an out-of-range duration SHALL return HTTP 400. Resume SHALL remain available for compatibility and for UI toggles that clear a manual hide or pin, even though the dock does not expose a standalone Resume control. Successful actions SHALL return the resulting visibility state and broadcast it. Malformed JSON or controller failure SHALL use existing UI-safe error conventions.

#### Scenario: Show with configured duration
- **WHEN** the dock posts an empty object to `/api/leaderboard/show`
- **THEN** the response reports timed visible state using the configured duration

#### Scenario: Explicit duration rejected
- **WHEN** a client posts `duration_seconds` 120
- **THEN** the response is HTTP 400 and state is unchanged

#### Scenario: Resume policy
- **WHEN** the dock posts to `/api/leaderboard/resume`
- **THEN** the response reflects the configured policy after the runtime override is cleared

### Requirement: Greeting definitions use bounded local API contracts
`GET /api/greetings` SHALL return exactly the fixed `new_viewer` and `returning_viewer` definitions with snake_case presentation fields. `POST /api/greetings/update` SHALL require a known `id`, accept the complete editable definition, apply the same field bounds and stored-asset validation as alert commands, and return the saved definition. Unknown ids MUST return HTTP 404; invalid fields MUST return the standard UI-safe field-error response without changing the stored definition.

#### Scenario: Read greeting catalog
- **WHEN** the admin requests `GET /api/greetings`
- **THEN** the response contains both definitions and no secrets or filesystem paths

#### Scenario: Reject unsafe image
- **WHEN** an update contains an absolute path or URL as `image_asset`
- **THEN** the server rejects the field and preserves the previous definition

### Requirement: Greeting preview is isolated from production
`POST /api/greetings/preview` SHALL accept a known greeting id plus a complete bounded draft presentation and optional bounded sample `viewer` and `message`. It MUST emit only a test alert frame to the existing overlay-debug audience and return `delivered_clients`. It MUST NOT persist the draft, publish to production `/ws`, create or update a viewer, mutate counters or greeting markers, or append interaction history.

#### Scenario: Preview draft
- **WHEN** a valid preview request is posted with one connected debug receiver
- **THEN** the response reports one delivered client and only the debug receiver receives the greeting frame

#### Scenario: Invalid preview
- **WHEN** preview text or presentation values exceed their bounds
- **THEN** the server returns a safe validation error and broadcasts no frame

### Requirement: Viewer update accepts greeting exclusion
`POST /api/viewers/update` SHALL accept optional boolean `greetings_disabled` alongside existing editable viewer fields. Viewer list and detail responses SHALL include `greetings_disabled` as a boolean defaulting to false.

#### Scenario: Persist viewer exclusion
- **WHEN** the operator posts `greetings_disabled` true for a known viewer
- **THEN** subsequent viewer list and detail responses return true

### Requirement: Progression catalogs use local POST-action API contracts
The API SHALL provide `GET /api/progression/levels`, `GET /api/progression/achievements`, and `GET /api/progression/settings` reads. Catalog mutations SHALL use `POST /api/progression/levels/create`, `/update`, `/delete`, `POST /api/progression/achievements/create`, `/update`, `/delete`, and `POST /api/progression/settings/update`, with ids in snake_case JSON bodies. Invalid fields MUST return the existing UI-safe field-error shape and MUST NOT partially persist or reconcile a rule.

#### Scenario: Reject an unsupported metric
- **WHEN** achievement create receives an unknown `metric`
- **THEN** it returns HTTP 400 with a field error and creates no definition or revision

#### Scenario: Delete with an id body
- **WHEN** the operator deletes a non-baseline level
- **THEN** the client posts its `id` to `/api/progression/levels/delete` and no identifier appears in the path

### Requirement: Viewer directory JSON includes session_count
`GET /api/viewers` and `GET /api/viewers/get` SHALL include integer `session_count` on each returned viewer. The field SHALL be present even when the value is 0. Existing period counter field names MUST remain unchanged. Clients that ignore unknown members MUST keep working.

#### Scenario: List includes the field
- **WHEN** the admin lists viewers
- **THEN** each viewer object includes `session_count` as an integer

#### Scenario: Get includes the same value
- **WHEN** the admin opens a known viewer via `GET /api/viewers/get`
- **THEN** that viewer object includes the same `session_count` as the list row

### Requirement: Viewer progression reads do not expose locked secrets
`GET /api/viewers/get` SHALL include current level, next-level progress, unlocked achievements, permitted in-progress achievements, and `progression_alerts_disabled`. `GET /api/viewers` SHALL include only the current level summary and the exclusion flag. Responses MUST omit locked secret definition and progress details.

#### Scenario: Viewer directory read
- **WHEN** the admin lists viewers
- **THEN** each viewer includes a nullable current-level summary without embedding the achievement catalog

### Requirement: Leaderboard reads expose optional level summaries
`GET /api/leaderboard` entries SHALL include a nullable `level` summary with stable id, title, and minimum all-time XP. The addition MUST NOT change rank, period counters, eligibility, or existing fields.

#### Scenario: Existing leaderboard reader
- **WHEN** a client ignores the new `level` member
- **THEN** it can continue reading rank, display name, portrait, XP, and message count unchanged

### Requirement: Progression preview is isolated from production
`POST /api/progression/preview` SHALL accept `kind` `achievement` or `level`, a complete bounded draft presentation, and optional bounded sample viewer data. It MUST publish only a test frame to the existing overlay-debug audience and return `delivered_clients`. It MUST NOT persist catalogs or settings, alter progression, append history, or publish to production `/ws`.

#### Scenario: Preview an unsaved achievement
- **WHEN** a valid achievement preview is posted with one debug receiver connected
- **THEN** the response reports one delivered client and production clients receive nothing

### Requirement: Session history uses bounded GET reads
`GET /api/sessions` SHALL accept an optional limit from 1 through 50 and opaque cursor and return newest-first session summaries plus optional `next_cursor`. `GET /api/sessions/get` SHALL require `id` as a query parameter and return one session detail or HTTP 404. Responses SHALL use snake_case, bounded ranking and achievement arrays, RFC3339 timestamps, and MUST NOT expose raw chat, source-message identifiers, filesystem paths, or hidden achievement definitions.

#### Scenario: List first page
- **WHEN** the admin requests `/api/sessions?limit=20`
- **THEN** at most twenty summaries and an optional opaque continuation cursor are returned

#### Scenario: Unknown session
- **WHEN** `/api/sessions/get?id=missing` is requested
- **THEN** the server returns HTTP 404 with a short JSON error

### Requirement: Recap reads expose current state safely
`GET /api/stream-recaps/current` SHALL return the open `session_id`, a bounded current-session `session` detail, runtime `visible`, nullable `window` (`session`, `all`, or null when hidden), stored current-session `snapshot` or null, and current `all_time` presentation. A visible session snapshot SHALL use the same bounded public wire shape sent to the overlay. `snapshot` MUST remain the immutable stored session recap when one exists, including while `window` is `all`. `all_time` SHALL be computed on read and MUST NOT be persisted. The current `session` detail MAY continue reflecting normalized activity after an immutable snapshot was captured. The read MUST NOT create or modify a snapshot.

#### Scenario: Current session not captured
- **WHEN** the current session has no recap
- **THEN** the response identifies and summarizes the session with `visible` false, `window` null, and `snapshot` null
- **AND** an `all_time` object is present

#### Scenario: All-time visible after session capture
- **WHEN** a snapshot is stored and all-time is visible
- **THEN** `visible` is true, `window` is `all`, `snapshot` matches the stored payload, and `all_time` is present

### Requirement: Recap mutations use POST actions
`POST /api/stream-recaps/show` SHALL require JSON `session_id`, atomically create or reuse the current-session snapshot, make recap visible with `window` `session`, broadcast state, and return `visible` true, `window` `session`, and the snapshot. `POST /api/stream-recaps/hide` SHALL accept `{}`, make recap hidden with `window` null, broadcast state, and return `visible` false. Invalid JSON or ids SHALL return HTTP 400, stale/non-current session ids HTTP 409, unavailable storage HTTP 503, and unexpected failures HTTP 500 without leaking details.

#### Scenario: Show current session
- **WHEN** a valid current `session_id` is posted to `/api/stream-recaps/show`
- **THEN** the response contains the committed bounded snapshot, `visible` true, and `window` `session`

#### Scenario: Hide is idempotent
- **WHEN** `/api/stream-recaps/hide` is called while recap is already hidden
- **THEN** it succeeds with `visible` false and no snapshot is deleted

#### Scenario: Old session cannot be replayed
- **WHEN** a completed historical session id is posted to Show
- **THEN** the request returns HTTP 409 and production visibility is unchanged

#### Scenario: Hide after all-time
- **WHEN** `/api/stream-recaps/hide` is called while all-time is visible
- **THEN** it succeeds with `visible` false and `window` null
- **AND** no snapshot is deleted

### Requirement: The recap page is a supported static read
`GET /overlay/recap` and its trailing-slash asset path SHALL be served alongside existing overlay pages without shadowing another route. The route MUST remain local and embeddable in OBS.

#### Scenario: Open recap page
- **WHEN** OBS requests `/overlay/recap`
- **THEN** the server returns the recap document rather than the chat or alert page

### Requirement: Overlay debug actions use typed POST-action routes

The server SHALL expose `POST /api/overlay-debug/scenario/fire` and `POST /api/overlay-debug/session/reset` as local action routes. Fire JSON MUST use snake_case, require one of `message`, `rewarded_message`, `command_alert`, `leaderboard_update`, or `alert_burst` as `scenario`, and MAY include applicable `display_name`, `message`, `label`, and `points` overrides. `display_name` MUST be at most 64 characters, `message` at most 500, `label` at most 80, and `points` an integer from 1 through 1000. Neither action accepts a routing key. Unknown scenarios or invalid optional fields MUST return the standard UI-safe error envelope and broadcast no frame. Alert display durations and scenario timing are server-controlled implementation constants.

#### Scenario: Fire a valid scenario
- **WHEN** a client posts a supported `scenario` and valid optional fields
- **THEN** the server returns HTTP 200 with `{"status":"started","run_id":"…","delivered_clients":N}` after the initial reset and immediate frames are enqueued and any delayed steps are scheduled
- **AND** `delivered_clients` is the number of unique currently connected debug sockets whose send queues accepted the initial reset/immediate delivery

#### Scenario: Reject arbitrary input
- **WHEN** a client posts an unknown scenario or an over-limit sample string
- **THEN** the server returns a UI-safe validation error
- **AND** broadcasts no frame

#### Scenario: Reset the global test channel
- **WHEN** a client posts to the reset action
- **THEN** the server globally cancels pending test steps, enqueues `debug_reset`, and returns HTTP 200 `{"status":"reset","delivered_clients":N}`
- **AND** `delivered_clients` counts unique connected debug sockets whose send queues accepted the reset

#### Scenario: Fire with no connected debug socket
- **WHEN** a client posts a valid scenario while no debug socket is connected
- **THEN** the server returns HTTP 200 with status `started`, a run ID, and `delivered_clients` equal to zero
- **AND** schedules no delayed scenario step

### Requirement: Recent messages include in-memory command outcomes
`GET` recent-message responses SHALL include optional `command_outcome` on a message when the process still holds an outcome for that platform plus source id. The object SHALL use `trigger`, `status` (`fired` or `cooldown`), and integer `cooldown_remaining_ms` matching the live `command_outcome` frame at read time. Messages without a stored outcome MUST omit the field. A process restart MUST NOT reconstruct outcomes from SQLite.

#### Scenario: Recent cooldown line
- **WHEN** admin or dock loads recent messages during an active cooldown
- **THEN** the matching command message includes `command_outcome.status` `cooldown` and remaining milliseconds greater than zero

#### Scenario: Ordinary chat omitted
- **WHEN** a recent line was never a matched command
- **THEN** the message object has no `command_outcome` field

### Requirement: All-time recap show is a POST action
`POST /api/stream-recaps/show-all` SHALL accept `{}`, compute the bounded all-time presentation, make recap visible with `window` `all`, broadcast state, and return `visible` true, `window` `all`, and `all_time`. The request MUST NOT require a `session_id`, MUST NOT write `stream_recaps`, and MUST NOT change session counters. Invalid JSON SHALL return HTTP 400, unavailable storage HTTP 503, and unexpected failures HTTP 500 without leaking details.

#### Scenario: Show all-time
- **WHEN** `{}` is posted to `/api/stream-recaps/show-all`
- **THEN** the response contains `visible` true, `window` `all`, and bounded all-time totals and ranking
- **AND** no snapshot row is inserted

#### Scenario: Show all-time rejects extra fields
- **WHEN** the body includes `session_id` or unknown members
- **THEN** the request returns HTTP 400 and visibility is unchanged
