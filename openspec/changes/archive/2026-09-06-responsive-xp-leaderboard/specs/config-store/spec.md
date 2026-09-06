## Purpose

Persist backward-compatible leaderboard presentation choices for responsive sizing, themed titles, and optional message counts.

## MODIFIED Requirements

### Requirement: Overlay presets may store per-surface overrides
Each overlay preset MAY include a `surfaces` object. `surfaces.leaderboard.sizing_mode` SHALL be `auto` or `fixed` when present. `surfaces.leaderboard.font_size_px` SHALL be an integer 12–48 when present. `surfaces.leaderboard.layout` SHALL be `panel` or `chips` when present. `surfaces.leaderboard.title_mode` SHALL be `theme`, `custom`, or `hidden` when present. `surfaces.leaderboard.title` SHALL be a string of at most 64 Unicode code points when present and SHALL be non-blank when `title_mode` is `custom`. `surfaces.leaderboard.show_message_count` SHALL be boolean when present and omitted SHALL default to false. `surfaces.leaderboard.max_entries` SHALL be an integer 1–20 when present; omitted SHALL default to 5. `surfaces.alerts.font_size_px` SHALL be an integer 12–48 when present, and `surfaces.alerts.image_size_pct` SHALL be an integer 25–300 when present. Omitted alerts font SHALL inherit the preset `font_size_px`; omitted alerts image size SHALL default to 100. `surfaces.chat.panel_opacity`, `surfaces.leaderboard.panel_opacity`, and `surfaces.alerts.panel_opacity` SHALL each be a number from 0 through 1 when present. Omitted surface opacity SHALL normally inherit shared `style.panel_opacity`. For a legacy `cockpit_panel`, `cockpit_popups`, or `g_rebels_popups` preset whose shared opacity is zero, omission SHALL preserve that theme's historical glass alpha; any explicit surface opacity, including zero, SHALL win. Unknown surface keys MAY be ignored. Chat fields on the preset SHALL remain the chat defaults. Page opacity MUST remain unsupported.

Omitted sizing SHALL resolve to `fixed` when a legacy leaderboard-specific `font_size_px` exists and to `auto` otherwise. A valid `font_size_px` query override SHALL always select fixed behavior. Omitted title mode SHALL resolve to `custom` when a non-blank legacy title exists and to `theme` otherwise. Theme mode MAY have no visible default title for a minimal theme. These resolutions MUST NOT rewrite stored presets merely because they were loaded or published unchanged.

#### Scenario: New default presentation
- **WHEN** a preset omits sizing mode, leaderboard font override, title mode, title, message-count visibility, and max entries
- **THEN** the leaderboard uses responsive sizing, the theme title, hides message count, and caps display at five rows

#### Scenario: Inherit font
- **WHEN** a saved preset has shared `font_size_px` 18 and no leaderboard font or sizing mode
- **THEN** automatic sizing uses 18 px as its fallback/reference base without creating an override

#### Scenario: Stored leaderboard font
- **WHEN** a preset stores leaderboard `font_size_px` 14 and no sizing mode
- **THEN** chat keeps the shared font and the leaderboard resolves fixed 14 px behavior

#### Scenario: Legacy custom font
- **WHEN** a stored preset has leaderboard `font_size_px` 14 and no sizing mode
- **THEN** it retains fixed 14 px behavior until the operator selects automatic sizing

#### Scenario: Legacy custom title
- **WHEN** a stored preset has non-blank title `Топ эфира` and no title mode
- **THEN** it resolves as a custom title in the selected theme's title slot

#### Scenario: Invalid custom title
- **WHEN** an update sets title mode to `custom` with a blank or overlong title
- **THEN** the save is rejected with a field error on the leaderboard title

#### Scenario: Invalid sizing or title mode
- **WHEN** an update sends an unknown leaderboard sizing mode or title mode
- **THEN** the save is rejected with a field error and the stored preset remains unchanged

#### Scenario: Invalid layout rejected
- **WHEN** an update sets `surfaces.leaderboard.layout` to a value other than `panel` or `chips`
- **THEN** the save is rejected with a field error on that layout field

#### Scenario: Invalid leaderboard font rejected
- **WHEN** an update sets `surfaces.leaderboard.font_size_px` to 8
- **THEN** the save is rejected with a field error on that font field

#### Scenario: Alert overrides remain valid
- **WHEN** a preset stores alerts font 24 and image size 150
- **THEN** chat keeps the shared font and `/overlay/alert` uses those valid overrides

#### Scenario: Stored alerts font
- **WHEN** a preset stores `surfaces.alerts.font_size_px` 24
- **THEN** chat keeps the shared font and `/overlay/alert` uses 24 px

#### Scenario: Invalid alerts font rejected
- **WHEN** an update sets `surfaces.alerts.font_size_px` to 8
- **THEN** the save is rejected with a field error on that font field

#### Scenario: Invalid alerts image size rejected
- **WHEN** an update sets `surfaces.alerts.image_size_pct` to 400
- **THEN** the save is rejected with a field error on that image-size field

#### Scenario: Invalid alert override rejected
- **WHEN** an update sets alerts font to 8 or image size to 400
- **THEN** the save is rejected with a field error on the invalid alert field

#### Scenario: Legacy preset inherits shared opacity
- **WHEN** a stored preset has shared panel opacity `0.58` and no surface opacity fields
- **THEN** Chat, Leaderboard, and Alerts each resolve panel opacity `0.58`

#### Scenario: Three independent opacity values
- **WHEN** a preset stores chat `0.20`, leaderboard `0.65`, and alerts `0.40`
- **THEN** public config preserves all three values independently

#### Scenario: Three independent values
- **WHEN** a preset stores chat opacity `0.20`, leaderboard opacity `0.65`, and alerts opacity `0.40`
- **THEN** public config preserves all three values independently

#### Scenario: Invalid surface opacity
- **WHEN** an update sets alerts panel opacity to `1.2`
- **THEN** the save is rejected with a field error and the stored preset is unchanged

#### Scenario: First publish from a legacy preset
- **WHEN** Studio opens a legacy preset and the operator publishes without changing opacity
- **THEN** every surface retains its effective appearance and no opacity override is materialized merely by publishing

#### Scenario: Legacy cockpit glass remains readable
- **WHEN** a cockpit preset has shared opacity `0` and no per-surface opacity fields
- **THEN** every surface retains that theme's historical glass alpha without rewriting the preset

#### Scenario: Explicit transparent cockpit surface
- **WHEN** the operator explicitly stores chat opacity `0` in that cockpit preset
- **THEN** chat chrome becomes transparent while omitted leaderboard and alerts surfaces retain historical glass alpha

#### Scenario: Invalid rank cap rejected
- **WHEN** an update sets `surfaces.leaderboard.max_entries` to 0
- **THEN** the save is rejected with a field error on that field

#### Scenario: Default rank cap
- **WHEN** a preset omits `surfaces.leaderboard.max_entries`
- **THEN** leaderboard data and rendering are capped at five rows

#### Scenario: Stored title
- **WHEN** a preset stores title `Топ эфира` and resolves custom mode
- **THEN** public config preserves that string and the leaderboard uses it in the themed title slot

#### Scenario: Overlong title rejected
- **WHEN** an update sets `surfaces.leaderboard.title` longer than 64 code points
- **THEN** the save is rejected with a field error on that field
