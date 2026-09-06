# OBS Leaderboard

## Purpose

Renders a transparent OBS Browser Source ranking of canonical viewers by XP for the current session, stats day, or all-time, updated live without mixing into the chat overlay.

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
The `period` query parameter SHALL accept `session`, `day`, or `all`. Missing or invalid values SHALL use `session`. Rows SHALL be canonical viewers who are not leaderboard-hidden, ordered by `xp` descending for that period, then by `message_count` descending. Each row SHALL include rank, display name, optional resolved `avatar_url`, `xp`, and `message_count`. Rows MUST NOT include `score`. Viewers with zero XP and zero messages in that period MAY be omitted. Visible ranking copy SHALL label the value as XP. The number of rows SHALL be at most the resolved `max_entries` (preset default 5, then a valid query `limit` 1–20 when present).

#### Scenario: Session ranking
- **WHEN** OBS loads `/overlay/leaderboard?period=session` after contribution in the current session
- **THEN** rows show session `xp` and `message_count` for active viewers

#### Scenario: Invalid period
- **WHEN** the URL has `period=week`
- **THEN** the page uses session ranking

#### Scenario: Default five rows
- **WHEN** more than five eligible viewers have XP and the preset omits `max_entries`
- **THEN** the overlay shows five rows ranked 1 through 5

#### Scenario: Query limit
- **WHEN** the URL has `limit=3` and at least three eligible viewers exist
- **THEN** the overlay shows three rows

#### Scenario: Hidden viewer omitted
- **WHEN** a leaderboard-hidden viewer would otherwise rank in the window
- **THEN** that viewer is absent and lower ranks move up

### Requirement: Leaderboard restores then follows live updates
After load, the page SHALL fetch `GET /api/leaderboard` with the same period and then apply `/ws` frames with `type` `"leaderboard"` for that period. `GET /api/leaderboard` entries SHALL use `xp` and MUST NOT use `score`. Fetch failure MUST NOT prevent later WebSocket updates.

#### Scenario: Browser Source refresh
- **WHEN** OBS reloads the leaderboard while viewers have XP
- **THEN** the ranking appears from the HTTP snapshot before new live frames

### Requirement: Leaderboard reconnects with backoff
If the WebSocket drops, the leaderboard page SHALL reconnect with exponential backoff starting at 1s and capped at 30s.

#### Scenario: Server restarts
- **WHEN** `/ws` closes
- **THEN** the leaderboard attempts to reconnect without operator action

### Requirement: Leaderboard appearance follows the overlay preset
The leaderboard page SHALL apply `overlay.presets` resolved by valid query `preset`, then `active_preset_id` when the query is missing or unknown, then the first preset: theme, shared style tokens, leaderboard sizing mode, font/layout, title mode and title, message-count visibility, max entries, and leaderboard panel opacity. It SHALL resolve opacity from `surfaces.leaderboard.panel_opacity`, normally falling back to shared `style.panel_opacity`. When a legacy cockpit preset has shared zero and no leaderboard override, leaderboard chrome SHALL retain that theme's historical glass color and alpha; an explicit leaderboard value, including zero, SHALL win. Query `font_size_px` SHALL select the fixed compatibility path when valid. Query `layout` SHALL override leaderboard layout when valid. Query `theme` SHALL override theme when it is a known theme id. Query `limit` SHALL override max entries when it is an integer 1–20. Chat-only fields (`max_messages`, `message_ttl_seconds`, platform marker) MUST NOT change ranking behavior, and opacity MUST NOT be applied to the transparent page, ranking text, or avatars.

#### Scenario: Preset query
- **WHEN** OBS loads `/overlay/leaderboard?preset=<id>&period=session` for an existing preset
- **THEN** the ranking uses that preset's theme and leaderboard surface settings

#### Scenario: Missing preset query
- **WHEN** OBS loads `/overlay/leaderboard?period=day` with no `preset`
- **THEN** the ranking uses the active overlay preset

#### Scenario: Invalid theme query
- **WHEN** the URL has `theme=not-a-theme`
- **THEN** the leaderboard keeps the preset theme

#### Scenario: Custom title
- **WHEN** the resolved title mode is `custom` with title `Лидеры`
- **THEN** `/overlay/leaderboard` shows `Лидеры` in the selected theme's title slot

#### Scenario: Blank title
- **WHEN** a legacy preset has an omitted or blank title and no title mode
- **THEN** the overlay resolves theme title mode rather than creating a separate blank heading

#### Scenario: Leaderboard opacity override
- **WHEN** a preset has shared panel opacity `0.50` and leaderboard panel opacity `0.80`
- **THEN** leaderboard background chrome uses `0.80` while the page stays transparent

#### Scenario: Legacy preset fallback
- **WHEN** a preset has no leaderboard opacity override
- **THEN** leaderboard chrome uses the shared panel opacity, except that a legacy cockpit preset with shared zero retains its historical glass

#### Scenario: Explicit transparent cockpit leaderboard
- **WHEN** a legacy cockpit preset stores leaderboard opacity `0`
- **THEN** leaderboard chrome is transparent even though omitted cockpit surfaces retain historical glass

### Requirement: Leaderboard layout is panel or chips
Leaderboard layout SHALL be `panel` or `chips`. Missing or invalid stored/query values SHALL use `panel`. Panel SHALL render ranks inside one themed frame. Chips SHALL render each rank as a separate themed chip in the same visual language. Query `layout` SHALL override the stored layout when valid.

#### Scenario: Default layout
- **WHEN** a preset has no leaderboard layout override
- **THEN** `/overlay/leaderboard` renders a panel

#### Scenario: Chips layout
- **WHEN** the resolved layout is `chips`
- **THEN** each rank is a separate chip, not one shared frame

### Requirement: Leaderboard sample preview never uses live stats
When the leaderboard URL includes `preview=sample`, the page SHALL generate a built-in fictitious ranking up to the resolved `max_entries` and apply the same responsive scale, complete-row fitting, title, and content rules as the live surface. It MUST NOT fetch `GET /api/leaderboard` or apply live `leaderboard` WebSocket snapshots for display. `preview_background` SHALL use the same values as chat overlay preview (`white`, `checker`, `scene`, `dark`; legacy `busy` as `scene`). Without a preview query, `html` and `body` backgrounds MUST stay transparent and live ranking SHALL work as already specified.

#### Scenario: Short sample preview
- **WHEN** a sample preview has five fictitious ranks but its height fits three complete rows
- **THEN** it shows the same top three and sizing behavior that a live source would show

#### Scenario: Sample preview
- **WHEN** `/overlay/leaderboard?preview=sample&preview_background=scene` loads with default max entries and enough height
- **THEN** a fictitious five-row ranking is shown and live viewer stats are not requested for that view

#### Scenario: Live OBS leaderboard
- **WHEN** `/overlay/leaderboard` loads without a preview query
- **THEN** the page background stays transparent and ranking data comes from the leaderboard API and `/ws`

### Requirement: Leaderboard scales as one bounded composition
In automatic sizing, the leaderboard SHALL derive one bounded responsive scale from the available Browser Source width and apply it consistently to text, avatars, gaps, padding, borders, and decorative chrome. Source height SHALL determine how many complete ranking rows are visible up to the resolved `max_entries`; the overlay MUST NOT expose a partial row or a scrollbar. In automatic sizing only, height MAY reduce the scale when required to preserve at least one complete row and its enabled title. Fixed sizing SHALL retain its configured base size and fit only complete rows.

#### Scenario: Wider source increases the composition scale
- **WHEN** the operator increases the leaderboard Browser Source viewport width while preserving sufficient height
- **THEN** the names, XP values, avatars, spacing, and themed chrome grow together within bounded limits

#### Scenario: Shorter source shows fewer rows
- **WHEN** five ranks are available but the source height can contain only three complete rows
- **THEN** ranks one through three are visible and rank four is not partially clipped

#### Scenario: Source grows vertically
- **WHEN** the source height grows enough for another complete row without exceeding `max_entries`
- **THEN** the next ranked viewer becomes visible without changing the established width-driven scale

#### Scenario: Fixed URL override
- **WHEN** a valid `font_size_px` query override is present
- **THEN** the leaderboard uses that fixed base size and still hides rows that do not fit completely

### Requirement: Leaderboard rows emphasize XP
Every visible row SHALL present rank, display name, and a clearly labelled XP value as primary content. `message_count` SHALL remain available in ranking data and MAY be shown only when the resolved `show_message_count` option is true. When shown, message count MUST be visually secondary and MAY be suppressed at compact dimensions before any primary content is removed.

#### Scenario: Default XP-first row
- **WHEN** a ranking row has 42 XP and 18 messages and `show_message_count` is omitted or false
- **THEN** the row prominently shows `42 XP` and does not show the message count

#### Scenario: Optional message count
- **WHEN** `show_message_count` is true and the source has sufficient room
- **THEN** the row shows a clearly secondary localized message count without reducing the prominence of XP

#### Scenario: Compact optional content
- **WHEN** `show_message_count` is true but the source is too narrow for all row content
- **THEN** message count is hidden before rank, display name, or XP

### Requirement: Title uses one theme-owned slot
The leaderboard SHALL render at most one real text title element. `title_mode` SHALL resolve as `theme`, `custom`, or `hidden`: `theme` uses the selected theme and layout's default title text, `custom` substitutes the configured `title` into the same themed slot, and `hidden` removes the slot and releases its height to rows. A custom title MUST NOT introduce an unrelated generic heading style.

#### Scenario: Cockpit theme title
- **WHEN** a cockpit panel resolves `title_mode` `theme`
- **THEN** its title slot shows the cockpit default `COMMRELAY RANKING` with cockpit typography and placement

#### Scenario: Custom cockpit title
- **WHEN** that preset resolves `title_mode` `custom` and title `Топ эфира`
- **THEN** `Топ эфира` replaces `COMMRELAY RANKING` in the same cockpit title slot

#### Scenario: Hidden title releases space
- **WHEN** the preset resolves `title_mode` `hidden`
- **THEN** no title is rendered and the fit calculation may use the released height for ranking rows
