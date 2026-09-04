## MODIFIED Requirements

### Requirement: Splash content uses avatar or custom media, template text, and sound
Each alert frame SHALL include `type` `"alert"`, viewer display `name`, `avatar_url` when known, resolved `text`, `points` (0 for command fires), `sound` (a built-in id, empty for silence, or omitted when a custom file is used), `duration_ms`, `layout` (`card`, `banner`, or `fullscreen`; missing or unknown values SHALL use `fullscreen`), `sound_volume` (0–100; missing SHALL use 70), optional `image_asset`, optional `sound_file`, optional `image_fit` (`cover`, `contain`, `fill`, or `tile`; missing SHALL use `contain`), and optional `image_size_pct` (25–300; missing or zero SHALL use 100). When `image_asset` is a safe stored filename, the client SHALL render `/overlay/assets/{filename}` as the primary graphic and SHALL apply `image_fit` to that element. When `image_asset` is absent or fails to load, the client SHALL render a built-in command signal or award medal instead of the viewer avatar. Known starter command triggers and award ids SHALL have stable semantic symbols; every other catalog item SHALL receive a stable generic emblem derived from its source and identifier. When `sound_file` is a safe stored filename, the client SHALL play `/overlay/assets/{filename}` at `sound_volume` and MUST NOT also play a built-in tone. Otherwise sound SHALL play in this page using the built-in tone set (`chime`, `ping`, `soft`, `alert`) or silence, at `sound_volume`. Text SHALL be a text node (no `innerHTML`), and built-in graphics MUST be decorative to assistive technology.

#### Scenario: Command uses a built-in signal
- **WHEN** an alert frame for `!gg` arrives without `image_asset`
- **THEN** the page shows the stable `gg` command signal and resolved text and plays the configured tone

#### Scenario: Award uses a built-in medal
- **WHEN** an award alert with `award_id` `spotter` arrives without `image_asset`
- **THEN** the page shows the stable Spotter medal rather than the viewer avatar

#### Scenario: Operator-created item uses a generic emblem
- **WHEN** an alert for an unknown command trigger or award id arrives without `image_asset`
- **THEN** the page shows a stable source-appropriate generic emblem derived from that identifier

#### Scenario: Silence
- **WHEN** `sound` is empty and `sound_file` is absent
- **THEN** the splash is visual only

#### Scenario: Custom image overrides the built-in graphic
- **WHEN** a command alert includes `image_asset` `asset_ab12cd.png`
- **THEN** the splash shows `/overlay/assets/asset_ab12cd.png` and does not show the built-in command signal or viewer avatar

#### Scenario: Broken custom image recovers
- **WHEN** an alert's stored custom image cannot be loaded
- **THEN** the matching built-in emblem replaces it without delaying or blocking the alert queue

#### Scenario: Custom sound
- **WHEN** an alert includes `sound_file` `asset_ff00.mp3` and `sound_volume` 70
- **THEN** the page plays that asset at 70 percent and does not play a built-in tone

### Requirement: Alert portrait scale expands the layout column
The alert client SHALL resolve a combined portrait scale from the active preset `surfaces.alerts.image_size_pct` (25–300; missing or zero SHALL use 100) multiplied by the alert frame `image_size_pct` (25–300; missing or zero SHALL use 100) for either a built-in or custom primary graphic. The portrait column SHALL grow with that scale and MUST push the accent bar and text area rather than overlapping them. In cockpit and popup themes the portrait grid track MUST NOT remain a fixed pixel width when scale is above 100 percent.

#### Scenario: Preset enlarges portrait
- **WHEN** the active preset stores `surfaces.alerts.image_size_pct` 150 and a sample or live alert is shown
- **THEN** the portrait slot is larger than at 100 percent and the text block starts farther to the right

#### Scenario: Item scale stacks on preset
- **WHEN** the preset portrait scale is 150 percent and a command alert includes `image_size_pct` 200
- **THEN** the built-in or custom primary graphic uses a 300 percent effective scale relative to the theme base size

#### Scenario: Studio preview honors draft scale
- **WHEN** Studio preview targets alerts with `preview=sample` and a valid `image_size_pct` query from the unpublished draft
- **THEN** the fictitious splash reflects that preset portrait scale before Publish
