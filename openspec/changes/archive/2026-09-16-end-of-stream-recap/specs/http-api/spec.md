## Purpose

Expose bounded local reads and POST-action mutations for session history and recap control.

## ADDED Requirements

### Requirement: Session history uses bounded GET reads
`GET /api/sessions` SHALL accept an optional limit from 1 through 50 and opaque cursor and return newest-first session summaries plus optional `next_cursor`. `GET /api/sessions/get` SHALL require `id` as a query parameter and return one session detail or HTTP 404. Responses SHALL use snake_case, bounded ranking and achievement arrays, RFC3339 timestamps, and MUST NOT expose raw chat, source-message identifiers, filesystem paths, or hidden achievement definitions.

#### Scenario: List first page
- **WHEN** the admin requests `/api/sessions?limit=20`
- **THEN** at most twenty summaries and an optional opaque continuation cursor are returned

#### Scenario: Unknown session
- **WHEN** `/api/sessions/get?id=missing` is requested
- **THEN** the server returns HTTP 404 with a short JSON error

### Requirement: Recap reads expose current state safely
`GET /api/stream-recaps/current` SHALL return the open `session_id`, a bounded current-session `session` detail, runtime `visible`, and the stored current-session `snapshot` or null. A visible snapshot SHALL use the same bounded public wire shape sent to the overlay. The current `session` detail MAY continue reflecting normalized activity after an immutable snapshot was captured, while `snapshot` MUST remain unchanged. The read MUST NOT create or modify a snapshot.

#### Scenario: Current session not captured
- **WHEN** the current session has no recap
- **THEN** the response identifies and summarizes the session with `visible` false and `snapshot` null

### Requirement: Recap mutations use POST actions
`POST /api/stream-recaps/show` SHALL require JSON `session_id`, atomically create or reuse the current-session snapshot, make it visible, broadcast state, and return `visible` true with the snapshot. `POST /api/stream-recaps/hide` SHALL accept `{}`, make recap hidden, broadcast state, and return `visible` false. Invalid JSON or ids SHALL return HTTP 400, stale/non-current session ids HTTP 409, unavailable storage HTTP 503, and unexpected failures HTTP 500 without leaking details.

#### Scenario: Show current session
- **WHEN** a valid current `session_id` is posted to `/api/stream-recaps/show`
- **THEN** the response contains the committed bounded snapshot and `visible` true

#### Scenario: Hide is idempotent
- **WHEN** `/api/stream-recaps/hide` is called while recap is already hidden
- **THEN** it succeeds with `visible` false and no snapshot is deleted

#### Scenario: Old session cannot be replayed
- **WHEN** a completed historical session id is posted to Show
- **THEN** the request returns HTTP 409 and production visibility is unchanged

### Requirement: The recap page is a supported static read
`GET /overlay/recap` and its trailing-slash asset path SHALL be served alongside existing overlay pages without shadowing another route. The route MUST remain local and embeddable in OBS.

#### Scenario: Open recap page
- **WHEN** OBS requests `/overlay/recap`
- **THEN** the server returns the recap document rather than the chat or alert page
