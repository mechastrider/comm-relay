## Purpose

Persist one opacity concept as independent Chat, Leaderboard, and Alerts values inside each overlay preset while preserving legacy presets.

## MODIFIED Requirements

### Requirement: Overlay presets may store per-surface overrides

Each overlay preset MAY include a `surfaces` object. `surfaces.leaderboard.font_size_px` SHALL be an integer 12–48 when present. `surfaces.leaderboard.layout` SHALL be `panel` or `chips` when present. Omitted leaderboard font SHALL inherit the preset `font_size_px`; omitted leaderboard layout SHALL default to `panel`. `surfaces.chat.panel_opacity`, `surfaces.leaderboard.panel_opacity`, and `surfaces.alerts.panel_opacity` SHALL each be a number from 0 through 1 when present. Omitted surface opacity SHALL normally inherit the preset shared `style.panel_opacity`. For a legacy `cockpit_panel`, `cockpit_popups`, or `g_rebels_popups` preset whose shared opacity is zero, omission SHALL instead preserve that theme's historical glass alpha; any explicit surface opacity, including zero, SHALL take precedence. Unknown surface keys MAY be ignored. Chat fields on the preset (`max_messages`, `message_ttl_seconds`, `font_size_px`, theme, style) SHALL remain the chat defaults. Page opacity MUST remain unsupported.

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
