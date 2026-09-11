## Purpose

Extend the local action API for greeting catalog management, isolated preview, and viewer exclusion.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Viewer update accepts greeting exclusion
`POST /api/viewers/update` SHALL accept optional boolean `greetings_disabled` alongside existing editable viewer fields. Viewer list and detail responses SHALL include `greetings_disabled` as a boolean defaulting to false.

#### Scenario: Persist viewer exclusion
- **WHEN** the operator posts `greetings_disabled` true for a known viewer
- **THEN** subsequent viewer list and detail responses return true
