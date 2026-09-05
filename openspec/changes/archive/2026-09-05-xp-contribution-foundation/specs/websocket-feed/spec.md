## Purpose

Broadcast leaderboard snapshots using XP so Live, dock, and OBS ranking stay aligned with the contribution counter.

## MODIFIED Requirements

### Requirement: Leaderboard snapshots are broadcast as a generic event
When viewer session, day, or all-time XP changes (including after merge, a new stream, an award, or an activity grant), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional `avatar_url`, `xp`, `message_count`). Entries MUST NOT include `score`. Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

#### Scenario: Score changes
- **WHEN** an award or activity grant increases a viewer's session XP
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries` that include `xp`

#### Scenario: Unknown type is ignored by chat overlay
- **WHEN** the chat overlay receives a `leaderboard` frame
- **THEN** it does not treat the frame as a chat message row

#### Scenario: Award changes XP
- **WHEN** an award increases a viewer's session XP
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries` that include `xp`

#### Scenario: Activity grant
- **WHEN** a silent activity grant increases a viewer's session XP
- **THEN** connected WebSocket clients receive a matching `session` leaderboard frame and MUST NOT receive an `alert` frame for that grant

#### Scenario: Counted line without activity
- **WHEN** a counted chat message increases `message_count` but not XP
- **THEN** connected WebSocket clients still receive `type` `leaderboard` with updated `message_count` for that period
