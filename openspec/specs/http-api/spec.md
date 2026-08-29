# HTTP API

## Purpose

Exposes a localhost JSON API and static pages using POST-action mutations, snake_case fields, and admin-safe error bodies.

## Requirements

### Requirement: Mutations use POST-action routes
API mutations SHALL use `POST /api/<resource>/<action>` with identifiers in the JSON body. The API MUST NOT use `PUT`, `DELETE`, or `PATCH`, and MUST NOT put `{id}` path parameters under `/api/`.

#### Scenario: Config save
- **WHEN** the admin saves settings
- **THEN** the client calls `POST /api/config/update`

#### Scenario: Message delete
- **WHEN** the operator deletes a chat line
- **THEN** the client calls `POST /api/messages/delete` with `platform` and `id` in the JSON body

### Requirement: Reads, health, static, WebSocket, and OAuth callbacks may use GET
The following GET routes SHALL remain available: `/`, `/overlay`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: Status poll
- **WHEN** the admin polls connector state
- **THEN** it uses `GET /api/status`

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
`POST /api/overlay/assets/upload` SHALL accept a multipart `file`, reject files over 512 KiB, reject HEIC/AVIF and unsafe SVG, and return `{"filename":"<stored name>"}` on success. `GET /overlay/assets/{filename}` SHALL serve only stored names that pass the asset-name safety check.

#### Scenario: PNG panel image
- **WHEN** the admin uploads a PNG under the size limit
- **THEN** the response is 200 with a generated `filename`

#### Scenario: HEIC upload
- **WHEN** the admin uploads a HEIC image
- **THEN** the response is 400 explaining that PNG or JPEG is required

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
