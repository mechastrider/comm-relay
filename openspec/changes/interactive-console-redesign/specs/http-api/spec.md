## Purpose

Expose a targeted active-preset action for hot console controls while retaining existing API conventions.

## ADDED Requirements

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
