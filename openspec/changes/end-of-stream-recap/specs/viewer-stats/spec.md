## Purpose

Extend persisted viewer session aggregates with operator-readable session history.

## ADDED Requirements

### Requirement: Historical session aggregates remain queryable
Every stream session SHALL retain its start time, optional next-session boundary time, and per-viewer message and XP rows after a new session begins. Session summary and detail reads SHALL calculate participation, message, XP, and ranking data for the selected `session_id` rather than silently substituting the current session. A recap `captured_at`, when present, SHALL be the authoritative closing cutoff shown for that recap; the next-session boundary MUST NOT be labelled as the end-of-stream time.

#### Scenario: Read prior ranking
- **WHEN** the operator opens a prior session after starting a new one
- **THEN** the detail uses that prior session's stored viewer rows and does not show current-session totals

#### Scenario: Session without recap
- **WHEN** an old session has only a later next-session boundary
- **THEN** the UI does not present that boundary as a confirmed stream-end time
