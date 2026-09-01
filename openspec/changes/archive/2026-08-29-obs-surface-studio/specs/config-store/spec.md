## ADDED Requirements

### Requirement: Overlay presets may store per-surface overrides
Each overlay preset MAY include a `surfaces` object. `surfaces.leaderboard.font_size_px` SHALL be an integer 12–48 when present. `surfaces.leaderboard.layout` SHALL be `panel` or `chips` when present. Omitted leaderboard font SHALL inherit the preset `font_size_px`. Omitted leaderboard layout SHALL default to `panel`. Unknown surface keys MAY be ignored. Chat fields on the preset (`max_messages`, `message_ttl_seconds`, `font_size_px`, theme, style) SHALL remain the chat defaults.

#### Scenario: Inherit font
- **WHEN** a saved preset has `font_size_px` 18 and no `surfaces.leaderboard.font_size_px`
- **THEN** the leaderboard uses 18 px until the operator stores an override

#### Scenario: Stored leaderboard font
- **WHEN** a preset stores `surfaces.leaderboard.font_size_px` 14
- **THEN** chat overlay keeps the preset `font_size_px` and the leaderboard uses 14 px

#### Scenario: Invalid layout rejected
- **WHEN** an update sets `surfaces.leaderboard.layout` to a value other than `panel` or `chips`
- **THEN** the save is rejected with a field error on that layout field

#### Scenario: Invalid leaderboard font rejected
- **WHEN** an update sets `surfaces.leaderboard.font_size_px` to 8
- **THEN** the save is rejected with a field error on that font field
