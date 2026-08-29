## ADDED Requirements

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
