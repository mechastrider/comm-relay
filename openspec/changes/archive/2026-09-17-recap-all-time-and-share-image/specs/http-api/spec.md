## Purpose

Expose windowed recap reads and the all-time show action without REST or snapshot mutation.

## ADDED Requirements

### Requirement: All-time recap show is a POST action
`POST /api/stream-recaps/show-all` SHALL accept `{}`, compute the bounded all-time presentation, make recap visible with `window` `all`, broadcast state, and return `visible` true, `window` `all`, and `all_time`. The request MUST NOT require a `session_id`, MUST NOT write `stream_recaps`, and MUST NOT change session counters. Invalid JSON SHALL return HTTP 400, unavailable storage HTTP 503, and unexpected failures HTTP 500 without leaking details.

#### Scenario: Show all-time
- **WHEN** `{}` is posted to `/api/stream-recaps/show-all`
- **THEN** the response contains `visible` true, `window` `all`, and bounded all-time totals and ranking
- **AND** no snapshot row is inserted

#### Scenario: Show all-time rejects extra fields
- **WHEN** the body includes `session_id` or unknown members
- **THEN** the request returns HTTP 400 and visibility is unchanged

## MODIFIED Requirements

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
