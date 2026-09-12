## Purpose

Deliver live progression refresh and one aggregated notification per committed cause.

## ADDED Requirements

### Requirement: Progression events use a stable aggregate envelope
For one live committed cause, the production feed SHALL publish at most one `viewer_progression` frame containing RFC3339 `created_at`, viewer id, display name, optional resolved `avatar_url`, current `level`, optional `previous_level`, an `achievements` array of newly unlocked id, revision, occurrence, name, and description snapshots, and the resolved progression `layout`, `sound`, `sound_volume`, and `duration_ms`. The frame SHALL include only announce-eligible results; it MUST NOT be sent with an empty result set. Clients that do not recognize the type MUST continue processing existing frames.

#### Scenario: Award causes multiple results
- **WHEN** one award crosses a level threshold and unlocks two announced achievements
- **THEN** clients receive one `viewer_progression` frame containing the level transition and both unlocks

#### Scenario: Administrative backfill
- **WHEN** a rule edit creates backfilled unlock rows
- **THEN** no production `viewer_progression` frame is broadcast

### Requirement: Source alert precedes its progression result
When an award or contract announcement and its derived progression event originate from the same committed operation, the source `alert` frame SHALL be enqueued before the `viewer_progression` frame. A dropped frame for one slow client MUST NOT stall other clients or roll back persisted state.

#### Scenario: Award reaches a new title
- **WHEN** a visible award grants XP that crosses a level threshold
- **THEN** the award alert is published first and the aggregate progression frame follows

### Requirement: Leaderboard snapshots may carry viewer level summaries
Live `leaderboard` entries SHALL add a nullable `level` summary containing stable id, title, and minimum all-time XP. Existing ranking fields and ordering MUST remain unchanged, and clients that ignore `level` MUST remain compatible.

#### Scenario: Ranked viewer has a title
- **WHEN** a leaderboard snapshot includes a viewer whose current level is Veteran
- **THEN** that entry carries the Veteran level summary without changing rank or XP
