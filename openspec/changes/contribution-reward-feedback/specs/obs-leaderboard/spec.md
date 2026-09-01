## Purpose

Let the leaderboard keep the shared theme while using an independently tuned background opacity for readability over gameplay.

## MODIFIED Requirements

### Requirement: Leaderboard appearance follows the overlay preset

The leaderboard page SHALL apply `overlay.presets` resolved by query `preset`, or `active_preset_id` when `preset` is missing or unknown: theme, shared style tokens, leaderboard font/layout, and leaderboard panel opacity. It SHALL resolve opacity from `surfaces.leaderboard.panel_opacity`, falling back to shared `style.panel_opacity`. Query `font_size_px` SHALL override leaderboard font when valid. Query `layout` SHALL override leaderboard layout when valid. Query `theme` SHALL override theme when it is a known theme id. Chat-only fields (`max_messages`, `message_ttl_seconds`, platform marker) MUST NOT change ranking behavior, and opacity MUST NOT be applied to the transparent page, ranking text, or avatars.

#### Scenario: Leaderboard opacity override
- **WHEN** a preset has shared panel opacity `0.50` and leaderboard panel opacity `0.80`
- **THEN** leaderboard background chrome uses `0.80` while the page stays transparent

#### Scenario: Legacy preset fallback
- **WHEN** a preset has no leaderboard opacity override
- **THEN** leaderboard chrome uses the shared panel opacity

#### Scenario: Preset query
- **WHEN** OBS loads `/overlay/leaderboard?preset=<id>&period=session` for an existing preset
- **THEN** the ranking uses that preset's theme and leaderboard font/layout

#### Scenario: Missing preset query
- **WHEN** OBS loads `/overlay/leaderboard?period=day` with no `preset`
- **THEN** the ranking uses the active overlay preset

#### Scenario: Invalid theme query
- **WHEN** the URL has `theme=not-a-theme`
- **THEN** the leaderboard keeps the preset theme
