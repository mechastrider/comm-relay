# OBS Leaderboard

## Purpose

Renders a transparent OBS Browser Source ranking of canonical viewers by score for the current session, stats day, or all-time, updated live without mixing into the chat overlay.

## Requirements

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

### Requirement: Leaderboard appearance follows the overlay preset
The leaderboard page SHALL apply `overlay.presets` resolved by query `preset` (or `active_preset_id` when `preset` is missing or unknown): theme, shared style tokens, and the leaderboard surface overrides. Query `font_size_px` SHALL override the leaderboard font when valid. Query `theme` SHALL override the theme when it is a known theme id. Chat-only fields (`max_messages`, `message_ttl_seconds`, platform marker) MUST NOT change ranking behavior.

#### Scenario: Preset query
- **WHEN** OBS loads `/overlay/leaderboard?preset=<id>&period=session` for an existing preset
- **THEN** the ranking uses that preset's theme and leaderboard font/layout

#### Scenario: Missing preset query
- **WHEN** OBS loads `/overlay/leaderboard?period=day` with no `preset`
- **THEN** the ranking uses the active overlay preset

#### Scenario: Invalid theme query
- **WHEN** the URL has `theme=not-a-theme`
- **THEN** the leaderboard keeps the preset theme

### Requirement: Leaderboard layout is panel or chips
Leaderboard layout SHALL be `panel` or `chips`. Missing or invalid stored/query values SHALL use `panel`. Panel SHALL render ranks inside one themed frame. Chips SHALL render each rank as a separate themed chip in the same visual language. Query `layout` SHALL override the stored layout when valid.

#### Scenario: Default layout
- **WHEN** a preset has no leaderboard layout override
- **THEN** `/overlay/leaderboard` renders a panel

#### Scenario: Chips layout
- **WHEN** the resolved layout is `chips`
- **THEN** each rank is a separate chip, not one shared frame

### Requirement: Leaderboard sample preview never uses live stats
When the leaderboard URL includes `preview=sample` (or another preview flag equivalent to the chat overlay preview), the page SHALL render a built-in fictitious top-5 and MUST NOT fetch `GET /api/leaderboard` or apply live `leaderboard` WebSocket snapshots for display. `preview_background` SHALL use the same values as chat overlay preview (`white`, `checker`, `scene`, `dark`; legacy `busy` as `scene`). Without a preview query, `html` and `body` backgrounds MUST stay transparent and live ranking SHALL work as already specified.

#### Scenario: Sample preview
- **WHEN** `/overlay/leaderboard?preview=sample&preview_background=scene` loads
- **THEN** a fictitious five-row ranking is shown and live viewer stats are not requested for that view

#### Scenario: Live OBS leaderboard
- **WHEN** `/overlay/leaderboard` loads without a preview query
- **THEN** the page background stays transparent and the ranking comes from the leaderboard API and `/ws`
