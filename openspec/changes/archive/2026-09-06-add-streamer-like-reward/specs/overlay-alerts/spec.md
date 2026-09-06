## MODIFIED Requirements

### Requirement: Splash content uses avatar or custom media, template text, and sound
Each alert frame SHALL include `type` `"alert"`, viewer display `name`, `avatar_url` when known, resolved `text`, `points` (0 for command fires), `sound` (a built-in id, empty for silence, or omitted when a custom file is used), `duration_ms`, `layout` (`card`, `banner`, or `fullscreen`; missing or unknown values SHALL use `fullscreen`), `sound_volume` (0–100; missing SHALL use 70), optional `image_asset`, optional `sound_file`, optional `image_fit` (`cover`, `contain`, `fill`, or `tile`; missing SHALL use `contain`), and optional `image_size_pct` (25–300; missing or zero SHALL use 100). When `image_asset` is a safe stored filename, the client SHALL render `/overlay/assets/{filename}` as the primary graphic and SHALL apply `image_fit` to that element. When `image_asset` is absent or fails to load, the client SHALL render a built-in command signal or award medal instead of the viewer avatar. Known starter command triggers and award ids SHALL have stable semantic symbols; the `like` award SHALL use an outlined thumbs-up with a small four-point sparkle. Every other catalog item SHALL receive a stable generic emblem derived from its source and identifier. When `sound_file` is a safe stored filename, the client SHALL play `/overlay/assets/{filename}` at `sound_volume` and MUST NOT also play a built-in tone. Otherwise sound SHALL play in this page using the built-in tone set (`chime`, `ping`, `soft`, `alert`) or silence, at `sound_volume`. Text SHALL be a text node (no `innerHTML`), and built-in graphics MUST be decorative to assistive technology.

#### Scenario: Command uses a built-in signal
- **WHEN** an alert frame for `!gg` arrives without `image_asset`
- **THEN** the page shows the stable `gg` command signal and resolved text and plays the configured tone

#### Scenario: Award uses a built-in medal
- **WHEN** an award alert with `award_id` `spotter` arrives without `image_asset`
- **THEN** the page shows the stable Spotter medal rather than the viewer avatar

#### Scenario: Streamer Like uses its semantic emblem
- **WHEN** an award alert with `award_id` `like` arrives without `image_asset`
- **THEN** the page shows an outlined thumbs-up with a small four-point sparkle

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

### Requirement: Templates resolve on the server
Splash templates MAY contain `{viewer}`, `{name}`, `{streamer}`, `{points}`, and `{message}`. The server SHALL substitute `{viewer}` and `{name}` with the canonical or last-seen display name, `{streamer}` with `streamer_display_name` (empty string when unset), `{points}` with the numeric points for that event, and `{message}` with the bounded award quote when present, otherwise the matched command line when the source is a command, otherwise empty. Unknown placeholders SHALL be left unchanged. Command fires SHALL substitute `{points}` as 0.

#### Scenario: Award template
- **WHEN** the fresh-catalog Advice award is granted to a viewer whose display name is `Bob`
- **THEN** the alert `text` contains `Bob` and `25`

#### Scenario: Viewer alias
- **WHEN** a template contains `{viewer}` and `{name}` and the viewer display name is `Alice`
- **THEN** both placeholders become `Alice`

#### Scenario: Streamer name
- **WHEN** `streamer_display_name` is `Jake` and the template contains `Hi from {streamer}`
- **THEN** the resolved alert text contains `Jake`

#### Scenario: Award message placeholder
- **WHEN** an award grant includes a bounded quote `nice catch` and the template contains `{message}`
- **THEN** the resolved text contains `nice catch`
