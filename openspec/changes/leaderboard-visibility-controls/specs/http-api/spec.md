## Purpose

Expose localhost-only read and POST-action controls for authoritative leaderboard visibility.

## ADDED Requirements

### Requirement: Leaderboard visibility state is readable
`GET /api/leaderboard/visibility` SHALL return the same `state`, `policy`, `visible`, `visible_until`, and `reason` fields used by the WebSocket visibility envelope.

#### Scenario: Dock recovery read
- **WHEN** the dock loads or reconnects while the board is timed
- **THEN** the read returns its current absolute deadline

### Requirement: Leaderboard visibility mutations use POST actions
The API SHALL provide `POST /api/leaderboard/show`, `/api/leaderboard/hide`, `/api/leaderboard/pin`, and `/api/leaderboard/resume`. Show MAY accept `duration_seconds`; omitted duration SHALL use config and an out-of-range duration SHALL return HTTP 400. Successful actions SHALL return the resulting visibility state and broadcast it. Malformed JSON or controller failure SHALL use existing UI-safe error conventions.

#### Scenario: Show with configured duration
- **WHEN** the dock posts an empty object to `/api/leaderboard/show`
- **THEN** the response reports timed visible state using the configured duration

#### Scenario: Explicit duration rejected
- **WHEN** a client posts `duration_seconds` 120
- **THEN** the response is HTTP 400 and state is unchanged

#### Scenario: Resume policy
- **WHEN** the dock posts to `/api/leaderboard/resume`
- **THEN** the response reflects the configured policy after the runtime override is cleared
