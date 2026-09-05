## MODIFIED Requirements

### Requirement: Chat events use a stable wire envelope
Each ingested chat message SHALL be broadcast as JSON with `type` `"message"`, `platform`, `user` (display name if present, otherwise username), `message`, and optional `id`, `username`, `display_name`, `avatar_url`, `badges`, `fragments`, and RFC3339 `timestamp`. When the connector omits `avatar_url` but the canonical viewer has a resolved portrait, the hub SHALL set `avatar_url` to that resolved URL before broadcast. Resolved URLs MAY be `/overlay/assets/{filename}` for cached or custom files.

#### Scenario: Display name present
- **WHEN** a chat event has both username `alice` and display name `Alice`
- **THEN** the wire payload `user` is `Alice` and `username` is `alice`

#### Scenario: Empty Twitch avatar filled from cache
- **WHEN** a Twitch line has no connector avatar and the viewer already has a cached or custom portrait
- **THEN** the `message` frame includes `avatar_url` pointing at that local asset

### Requirement: Leaderboard snapshots are broadcast as a generic event
When viewer session, day, or all-time XP changes (including after merge, a new stream, an award, an activity grant, a leaderboard-hidden toggle, a custom portrait change, or a rank-cap change that requires a refresh), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional resolved `avatar_url`, `xp`, `message_count`). Entries MUST NOT include `score`. Entries MUST omit leaderboard-hidden viewers and MUST contain at most the resolved `max_entries`. Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

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

#### Scenario: Hide from ranking
- **WHEN** the operator hides a ranked viewer
- **THEN** the next `leaderboard` frames omit that viewer and re-rank the remaining rows
