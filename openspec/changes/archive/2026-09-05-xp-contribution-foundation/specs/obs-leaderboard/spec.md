## Purpose

Rank canonical viewers by XP for the current session, stats day, or all-time without mixing into the chat overlay.

## MODIFIED Requirements

### Requirement: Period query selects the ranking window
The `period` query parameter SHALL accept `session`, `day`, or `all`. Missing or invalid values SHALL use `session`. Rows SHALL be canonical viewers ordered by `xp` descending for that period, then by `message_count` descending. Each row SHALL include rank, display name, optional avatar URL, `xp`, and `message_count`. Rows MUST NOT include `score`. Viewers with zero XP and zero messages in that period MAY be omitted. Visible ranking copy SHALL label the value as XP.

#### Scenario: Session ranking
- **WHEN** OBS loads `/overlay/leaderboard?period=session` after contribution in the current session
- **THEN** rows show session `xp` and `message_count` for active viewers

#### Scenario: Invalid period
- **WHEN** the URL has `period=week`
- **THEN** the page uses session ranking

### Requirement: Leaderboard restores then follows live updates
After load, the page SHALL fetch `GET /api/leaderboard` with the same period and then apply `/ws` frames with `type` `"leaderboard"` for that period. `GET /api/leaderboard` entries SHALL use `xp` and MUST NOT use `score`. Fetch failure MUST NOT prevent later WebSocket updates.

#### Scenario: Browser Source refresh
- **WHEN** OBS reloads the leaderboard while viewers have XP
- **THEN** the ranking appears from the HTTP snapshot before new live frames
