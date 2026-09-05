## Purpose

Store a global display name for splash templates and keep it on the public config.

## ADDED Requirements

### Requirement: streamer_display_name is a persisted operator string
`config.json` SHALL store `streamer_display_name` as a string, default empty. The value SHALL be trimmed. Length MUST be at most 64 Unicode code points. Omitted keys on load SHALL default to empty. Public `GET /api/config` SHALL include the field. Invalid non-string or overlong values SHALL be rejected with a field error. The field is installation-global; overlay presets MUST NOT override it in this change.

#### Scenario: First launch
- **WHEN** CommRelay starts and `config.json` is absent
- **THEN** public config includes `streamer_display_name` as an empty string

#### Scenario: Save name
- **WHEN** the operator saves `streamer_display_name` `Jake`
- **THEN** `POST /api/config/update` persists `Jake` and later template resolution uses `Jake`

#### Scenario: Too long
- **WHEN** an update sets `streamer_display_name` longer than 64 Unicode code points
- **THEN** the save is rejected with a field error on `streamer_display_name`
