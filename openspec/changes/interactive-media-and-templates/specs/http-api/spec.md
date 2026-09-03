## Purpose

Upload interactive images and sounds into the existing overlay-assets directory with stricter types than panel chrome.

## MODIFIED Requirements

### Requirement: Overlay assets upload is bounded and type-checked
`POST /api/overlay/assets/upload` SHALL accept a multipart `file` and optional form field `kind` of `panel` (default), `alert_image`, or `alert_sound`. Panel uploads SHALL keep the existing 512 KiB limit, reject HEIC/AVIF and unsafe SVG, and return `{"filename":"<stored name>"}` on success. `kind` `alert_image` SHALL accept static PNG, JPEG, or WebP up to 4 MiB, reject SVG, GIF, HEIC/AVIF, and animated WebP, and reject images whose decoded pixel count exceeds 16 megapixels or whose longest side exceeds 4096 px. `kind` `alert_sound` SHALL accept MP3 or WAV up to 5 MiB whose decoded duration is 1–15 seconds, reject other types, and reject looping metadata as a reason to fail closed if duration cannot be determined. `GET /overlay/assets/{filename}` SHALL serve only stored names that pass the asset-name safety check, including audio. Type SHALL be detected from content, not only the filename extension.

#### Scenario: PNG panel image
- **WHEN** the admin uploads a PNG under the size limit
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

## ADDED Requirements

### Requirement: Unreferenced overlay assets may be deleted
`POST /api/overlay/assets/delete` SHALL accept JSON `filename`. The system SHALL delete the file only when no overlay preset panel image, command `image_asset`/`sound_file`, or award `image_asset`/`sound_file` references it. A referenced filename SHALL fail with HTTP 400. Unknown safe names SHALL fail with HTTP 404 or 400 without deleting other files.

#### Scenario: In-use image
- **WHEN** command `gg` references `asset_ab.png` and the operator deletes that filename
- **THEN** the file remains and the request fails with a field or error message that it is in use
