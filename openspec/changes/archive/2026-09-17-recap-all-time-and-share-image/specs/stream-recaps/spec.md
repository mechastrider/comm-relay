## Purpose

Keep session recap capture immutable while adding an ephemeral all-time status window on the same recap surface.

## ADDED Requirements

### Requirement: All-time recap is live status, not a capture
The system SHALL compute a bounded all-time presentation from current canonical viewer aggregates without writing `stream_recaps`. Unique `viewer_count` SHALL be the number of non-hidden canonical viewers with all-time `message_count` greater than 0. `message_count` and `xp` totals SHALL be the sums of those all-time fields over non-hidden canonical viewers. Ranking SHALL contain at most five rows using the same eligibility, ordering, portraits, and optional titles as `GET /api/leaderboard` with `period` `all`. The all-time presentation MUST omit achievement groups. Showing, switching to, or hiding all-time MUST NOT create, replace, or delete a session snapshot and MUST NOT start, end, or reset a session.

#### Scenario: Show all-time without a session snapshot
- **WHEN** the current session has no stored recap and the operator shows the all-time window
- **THEN** recap becomes visible with all-time totals and ranking
- **AND** no `stream_recaps` row is created

#### Scenario: Switch away from a captured session
- **WHEN** a session snapshot is stored and visible and the operator shows all-time
- **THEN** the stored snapshot bytes remain unchanged
- **AND** the visible recap shows all-time status without achievement groups

#### Scenario: Unique viewers exclude silent XP-only identities
- **WHEN** one canonical viewer has all-time XP and zero messages and another has messages
- **THEN** all-time `viewer_count` is 1
- **AND** totals still include the first viewer's XP

### Requirement: Recap presentation has one visible window
Runtime recap state SHALL be hidden, or visible with exactly one window: `session` or `all`. Session window SHALL reuse the stored current-session snapshot and existing capture rules. All-time window SHALL use the last computed all-time presentation until the operator hides, switches, shows all-time again, or starts a new stream. Showing all-time again SHALL recompute from current aggregates. Process restart SHALL start hidden. New stream SHALL hide whichever window is visible without deleting stored snapshots.

#### Scenario: Reshow all-time refreshes status
- **WHEN** all-time is visible and later awards increase all-time XP and the operator shows all-time again
- **THEN** the visible presentation includes the new totals

#### Scenario: Session show remains immutable
- **WHEN** a session snapshot is stored and later activity occurs and the operator shows the session window
- **THEN** the previously captured snapshot is shown unchanged

## MODIFIED Requirements

### Requirement: Recap visibility is server-authoritative but ephemeral
The server SHALL maintain one runtime recap visibility state: hidden, or visible with `window` `session` plus the stored current-session snapshot, or visible with `window` `all` plus the last all-time presentation. Show session, show all-time, and Hide SHALL broadcast the committed state. Visibility MUST begin hidden after process startup, while stored snapshots remain available. Starting a new session SHALL hide any visible window but MUST NOT delete stored snapshots.

#### Scenario: Restart after capture
- **WHEN** the process restarts after a recap was captured and visible
- **THEN** the snapshot remains in history but the runtime recap state is hidden

#### Scenario: New stream after recap
- **WHEN** the operator starts a new stream while a recap is visible
- **THEN** the recap becomes hidden and the previous snapshot remains readable in session history

#### Scenario: Restart after all-time visible
- **WHEN** the process restarts while all-time recap was visible
- **THEN** runtime recap state is hidden
- **AND** any previously stored session snapshot remains in history
