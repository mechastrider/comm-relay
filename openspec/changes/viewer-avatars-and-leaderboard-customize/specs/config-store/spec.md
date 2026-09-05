## MODIFIED Requirements

### Requirement: Overlay presets may store per-surface overrides
Each overlay preset MAY include a `surfaces` object. `surfaces.leaderboard.font_size_px` SHALL be an integer 12–48 when present. `surfaces.leaderboard.layout` SHALL be `panel` or `chips` when present. `surfaces.leaderboard.title` SHALL be a string of at most 64 Unicode code points when present; omitted or blank SHALL mean no on-stream heading. `surfaces.leaderboard.max_entries` SHALL be an integer 1–20 when present; omitted SHALL default to 5. `surfaces.alerts.font_size_px` SHALL be an integer 12–48 when present. `surfaces.alerts.image_size_pct` SHALL be an integer 25–300 when present. Omitted leaderboard font SHALL inherit the preset `font_size_px`; omitted leaderboard layout SHALL default to `panel`; omitted alerts font SHALL inherit the preset `font_size_px`; omitted alerts image size SHALL default to 100. `surfaces.chat.panel_opacity`, `surfaces.leaderboard.panel_opacity`, and `surfaces.alerts.panel_opacity` SHALL each be a number from 0 through 1 when present. Omitted surface opacity SHALL normally inherit the preset shared `style.panel_opacity`. For a legacy `cockpit_panel`, `cockpit_popups`, or `g_rebels_popups` preset whose shared opacity is zero, omission SHALL instead preserve that theme's historical glass alpha; any explicit surface opacity, including zero, SHALL take precedence. Unknown surface keys MAY be ignored. Chat fields on the preset (`max_messages`, `message_ttl_seconds`, `font_size_px`, theme, style) SHALL remain the chat defaults. Page opacity MUST remain unsupported.

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

#### Scenario: Stored alerts font
- **WHEN** a preset stores `surfaces.alerts.font_size_px` 24
- **THEN** chat overlay keeps the preset `font_size_px` and `/overlay/alert` uses 24 px

#### Scenario: Invalid alerts font rejected
- **WHEN** an update sets `surfaces.alerts.font_size_px` to 8
- **THEN** the save is rejected with a field error on that font field

#### Scenario: Invalid alerts image size rejected
- **WHEN** an update sets `surfaces.alerts.image_size_pct` to 400
- **THEN** the save is rejected with a field error on that image-size field

#### Scenario: Legacy preset inherits shared opacity
- **WHEN** a stored preset has shared panel opacity `0.58` and no surface opacity fields
- **THEN** Chat, Leaderboard, and Alerts each resolve panel opacity `0.58`

#### Scenario: Three independent values
- **WHEN** a preset stores chat `0.20`, leaderboard `0.65`, and alerts `0.40`
- **THEN** the public config preserves all three values independently

#### Scenario: Invalid surface opacity
- **WHEN** an update sets `surfaces.alerts.panel_opacity` to `1.2`
- **THEN** the save is rejected with a field error for alert panel opacity and the stored preset is unchanged

#### Scenario: First publish from a legacy preset
- **WHEN** Studio opens a legacy preset and the operator publishes without changing opacity
- **THEN** every surface retains its former effective appearance and no opacity override is materialized merely by publishing

#### Scenario: Legacy cockpit glass remains readable
- **WHEN** a cockpit preset has shared opacity `0` and no per-surface opacity fields
- **THEN** every surface retains that theme's historical glass alpha without rewriting the preset

#### Scenario: Explicit transparent cockpit surface
- **WHEN** the operator explicitly stores chat opacity `0` in that cockpit preset
- **THEN** chat chrome becomes transparent while the omitted leaderboard and alerts surfaces retain their historical glass alpha

#### Scenario: Default rank cap
- **WHEN** a preset omits `surfaces.leaderboard.max_entries`
- **THEN** leaderboard snapshots and `/overlay/leaderboard` show at most 5 rows

#### Scenario: Stored title
- **WHEN** a preset stores `surfaces.leaderboard.title` `Топ эфира`
- **THEN** public config preserves that string and the leaderboard overlay shows it as the heading

#### Scenario: Invalid rank cap rejected
- **WHEN** an update sets `surfaces.leaderboard.max_entries` to 0
- **THEN** the save is rejected with a field error on that field

#### Scenario: Overlong title rejected
- **WHEN** an update sets `surfaces.leaderboard.title` longer than 64 code points
- **THEN** the save is rejected with a field error on that field

## ADDED Requirements

### Requirement: custom_avatars_enabled is a persisted operator flag
`config.json` SHALL store `custom_avatars_enabled` as a boolean, default true. Omitted keys on load SHALL default to true. Public `GET /api/config` SHALL include the flag. Invalid non-boolean values SHALL be rejected with a field error. The field is installation-global; overlay presets MUST NOT override it.

#### Scenario: First launch
- **WHEN** a new config file is created
- **THEN** `custom_avatars_enabled` is true

#### Scenario: Legacy file
- **WHEN** an existing config omits `custom_avatars_enabled`
- **THEN** the store treats it as true without dropping other settings

#### Scenario: Disable custom portraits
- **WHEN** the operator saves `custom_avatars_enabled` false
- **THEN** resolved portraits ignore stored custom files until the flag is enabled again
