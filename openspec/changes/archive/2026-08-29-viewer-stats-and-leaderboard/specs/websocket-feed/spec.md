## ADDED Requirements

### Requirement: Leaderboard snapshots are broadcast as a generic event
When viewer session, day, or all-time scores change (including after merge or a new stream), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional `avatar_url`, `score`, `message_count`). Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

#### Scenario: Score changes
- **WHEN** a counted chat message increases a viewer's session score
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries`

#### Scenario: Unknown type is ignored by chat overlay
- **WHEN** the chat overlay receives a `leaderboard` frame
- **THEN** it does not treat the frame as a chat message row
