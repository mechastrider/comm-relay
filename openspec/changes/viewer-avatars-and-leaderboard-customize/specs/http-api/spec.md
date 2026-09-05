## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Viewer portrait files count as overlay-asset references
`POST /api/overlay/assets/delete` SHALL treat `viewers.custom_avatar` and `viewer_identities.avatar_cache` filenames as in-use references, in addition to preset panel images and catalog `image_asset`/`sound_file`. Deleting an in-use portrait filename SHALL fail with HTTP 400 and MUST NOT remove the file.

#### Scenario: Cached portrait in use
- **WHEN** an identity `avatar_cache` is `asset_ab.png` and the operator deletes that filename
- **THEN** the file remains and the request fails as in use
