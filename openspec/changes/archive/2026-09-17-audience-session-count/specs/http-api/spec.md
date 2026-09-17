# Spec Delta

## ADDED Requirements

### Requirement: Viewer directory JSON includes session_count
`GET /api/viewers` and `GET /api/viewers/get` SHALL include integer `session_count` on each returned viewer. The field SHALL be present even when the value is 0. Existing period counter field names MUST remain unchanged. Clients that ignore unknown members MUST keep working.

#### Scenario: List includes the field
- **WHEN** the admin lists viewers
- **THEN** each viewer object includes `session_count` as an integer

#### Scenario: Get includes the same value
- **WHEN** the admin opens a known viewer via `GET /api/viewers/get`
- **THEN** that viewer object includes the same `session_count` as the list row
