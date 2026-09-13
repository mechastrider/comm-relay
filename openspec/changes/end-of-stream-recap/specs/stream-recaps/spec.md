## Purpose

Define manual, durable end-of-stream recap snapshots and bounded session history without changing the existing operator-controlled session boundary.

## ADDED Requirements

### Requirement: Recap capture is manual, immutable, and session-safe
The system SHALL create at most one recap snapshot for the currently open stream session when the operator confirms Show recap. The request MUST identify the expected current `session_id`; a stale or non-current id MUST fail without capturing or showing anything. Capture and snapshot persistence MUST be atomic. Repeating Show for that session SHALL reuse the stored snapshot. Capturing, showing, hiding, or re-showing a recap MUST NOT end the session, create a session, reset counters, or alter XP, achievements, awards, commands, contracts, or leaderboard visibility.

#### Scenario: First confirmed show
- **WHEN** the operator confirms Show recap for the open session and no snapshot exists
- **THEN** one snapshot is committed from that session's state and becomes the visible recap
- **AND** the session id and counters remain unchanged

#### Scenario: Repeat show
- **WHEN** the operator shows a recap again after later chat activity
- **THEN** the previously captured snapshot is shown unchanged

#### Scenario: Stale dialog
- **WHEN** another client starts a new session before an older recap dialog confirms its prior `session_id`
- **THEN** capture fails with a conflict and no recap becomes visible

### Requirement: Snapshot content is bounded and public-safe
A recap snapshot SHALL contain a format version, snapshot id, session id, session `started_at`, `captured_at`, total participating viewers, total messages, total session XP, at most five leaderboard rows, and at most six achievement groups. Leaderboard rows SHALL use the final session ordering and include rank, snapshotted display name, optional resolved portrait URL, session XP, message count, and optional current title. Viewers excluded from leaderboards MUST be omitted from ranking rows. Achievement groups SHALL contain only non-backfilled unlocks attributed to that session whose current definition permits announcement and whose viewer has not disabled progression announcements; unlocked secret achievements MAY appear. Repeated occurrences of the same achievement revision for one viewer SHALL be grouped with their count, and groups SHALL be selected by latest unlock time descending. Global live progression-alert toggles MUST NOT suppress an explicitly requested recap.

#### Scenario: Busy session is bounded
- **WHEN** a session has twelve ranked viewers and ten eligible achievement groups
- **THEN** the snapshot contains the top five ranking rows and the six most recently unlocked groups

#### Scenario: Viewer visibility preferences
- **WHEN** a leaderboard-hidden viewer ranks first and another viewer has disabled progression announcements
- **THEN** the first viewer is absent from recap rankings and the second viewer's unlocks are absent from recap achievements

#### Scenario: Empty session
- **WHEN** the operator captures a session with no participation or eligible achievements
- **THEN** a valid zero-total snapshot is created for the closing presentation

### Requirement: Recap visibility is server-authoritative but ephemeral
The server SHALL maintain one runtime recap visibility state containing either hidden or the visible current-session snapshot. Show and Hide actions SHALL broadcast the committed state. Visibility MUST begin hidden after process startup, while stored snapshots remain available. Starting a new session SHALL hide any visible recap but MUST NOT delete its snapshot.

#### Scenario: Restart after capture
- **WHEN** the process restarts after a recap was captured and visible
- **THEN** the snapshot remains in history but the runtime recap state is hidden

#### Scenario: New stream after recap
- **WHEN** the operator starts a new stream while a recap is visible
- **THEN** the recap becomes hidden and the previous snapshot remains readable in session history

### Requirement: Session history is durable and bounded per response
The system SHALL retain existing stream-session rows, per-viewer session aggregates, attributed interactions, attributed achievement unlocks, and recap snapshots in local SQLite. It SHALL expose cursor-paginated session summaries ordered newest first and a detail for one session. A summary SHALL identify whether the session is current and whether it has a recap. A detail SHALL provide aggregate totals, the same bounded public-safe leaderboard and achievement grouping used for capture, and the stored recap when present. The system MUST NOT reconstruct or expose full chat text.

#### Scenario: Historical session without recap
- **WHEN** the operator opens a completed session that predates recap capture
- **THEN** its available aggregate totals and attributed achievements are shown without inventing a stored recap

#### Scenario: Large history
- **WHEN** more sessions exist than the requested page limit
- **THEN** the response contains no more than that limit and provides an opaque cursor for the next page
