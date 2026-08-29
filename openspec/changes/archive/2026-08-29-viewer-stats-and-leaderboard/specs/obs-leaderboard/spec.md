## Purpose

Renders a transparent OBS Browser Source ranking of canonical viewers by score for the current session, stats day, or all-time, updated live without mixing into the chat overlay.

## ADDED Requirements

### Requirement: Leaderboard page background stays transparent
The leaderboard document at `/overlay/leaderboard` SHALL use a transparent page background so OBS Browser Source does not show a solid rectangle behind the ranking. Chat `/overlay` MUST remain a separate URL.

#### Scenario: Default leaderboard CSS
- **WHEN** OBS loads `/overlay/leaderboard`
- **THEN** `html` and `body` backgrounds are transparent

#### Scenario: Chat overlay unchanged
- **WHEN** OBS loads `/overlay`
- **THEN** the chat overlay document is served and does not embed the leaderboard ranking

### Requirement: Period query selects the ranking window
The `period` query parameter SHALL accept `session`, `day`, or `all`. Missing or invalid values SHALL use `session`. Rows SHALL be canonical viewers ordered by `score` descending for that period, then by `message_count` descending. Each row SHALL include rank, display name, optional avatar URL, `score`, and `message_count`. Viewers with zero score and zero messages in that period MAY be omitted.

#### Scenario: Session ranking
- **WHEN** OBS loads `/overlay/leaderboard?period=session` after chat activity in the current session
- **THEN** rows show session `score` and `message_count` for active viewers

#### Scenario: Invalid period
- **WHEN** the URL has `period=week`
- **THEN** the page uses session ranking

### Requirement: Leaderboard restores then follows live updates
After load, the page SHALL fetch `GET /api/leaderboard` with the same period and then apply `/ws` frames with `type` `"leaderboard"` for that period. Fetch failure MUST NOT prevent later WebSocket updates.

#### Scenario: Browser Source refresh
- **WHEN** OBS reloads the leaderboard while viewers have scores
- **THEN** the ranking appears from the HTTP snapshot before new live frames

### Requirement: Leaderboard reconnects with backoff
If the WebSocket drops, the leaderboard page SHALL reconnect with exponential backoff starting at 1s and capped at 30s.

#### Scenario: Server restarts
- **WHEN** `/ws` closes
- **THEN** the leaderboard attempts to reconnect without operator action
