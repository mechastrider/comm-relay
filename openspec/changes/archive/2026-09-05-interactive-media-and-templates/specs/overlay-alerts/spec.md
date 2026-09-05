## Purpose

Show custom command and award media on the alert surface and compose card, banner, or fullscreen layouts inside the Browser Source.

## MODIFIED Requirements

### Requirement: Splash content uses avatar, template text, and a built-in tone
Each alert frame SHALL include `type` `"alert"`, viewer display `name`, `avatar_url` when known, resolved `text`, `points` (0 for command fires), `sound` (a built-in id, empty for silence, or omitted when a custom file is used), `duration_ms`, `layout` (`card`, `banner`, or `fullscreen`; missing values SHALL use `card`), and `sound_volume` (0–100; missing SHALL use 70). When `image_asset` is a safe stored filename, the client SHALL render `/overlay/assets/{filename}` instead of the viewer avatar. When `image_asset` is absent, the client SHALL render the avatar image when the URL is http(s), otherwise a nameless placeholder. When `sound_file` is a safe stored filename, the client SHALL play `/overlay/assets/{filename}` at `sound_volume` and MUST NOT also play a built-in tone. Otherwise Sound SHALL play in this page using the built-in tone set (`chime`, `ping`, `soft`, `alert`) or silence, at `sound_volume`. Text SHALL be a text node (no `innerHTML`).

#### Scenario: Command splash
- **WHEN** an alert frame for `!gg` arrives with a viewer avatar and text `Good game, Alice!`
- **THEN** the page shows that avatar and text and plays the configured tone

#### Scenario: Silence
- **WHEN** `sound` is empty and `sound_file` is absent
- **THEN** the splash is visual only

#### Scenario: Custom image replaces avatar
- **WHEN** a command alert includes `image_asset` `asset_ab12cd.png`
- **THEN** the splash shows `/overlay/assets/asset_ab12cd.png` and does not show the viewer avatar

#### Scenario: Custom sound
- **WHEN** an alert includes `sound_file` `asset_ff00.mp3` and `sound_volume` 70
- **THEN** the page plays that asset at 70 percent and does not play a built-in tone

### Requirement: Templates resolve on the server
Splash templates MAY contain `{viewer}`, `{name}`, `{streamer}`, `{points}`, and `{message}`. The server SHALL substitute `{viewer}` and `{name}` with the canonical or last-seen display name, `{streamer}` with `streamer_display_name` (empty string when unset), `{points}` with the numeric points for that event, and `{message}` with the bounded award quote when present, otherwise the matched command line when the source is a command, otherwise empty. Unknown placeholders SHALL be left unchanged. Command fires SHALL substitute `{points}` as 0.

#### Scenario: Award template
- **WHEN** Advice is granted to a viewer whose display name is `Bob`
- **THEN** the alert `text` contains `Bob` and `50`

#### Scenario: Viewer alias
- **WHEN** a template contains `{viewer}` and `{name}` and the viewer display name is `Alice`
- **THEN** both placeholders become `Alice`

#### Scenario: Streamer name
- **WHEN** `streamer_display_name` is `Jake` and the template contains `Hi from {streamer}`
- **THEN** the resolved alert text contains `Jake`

#### Scenario: Award message placeholder
- **WHEN** an award grant includes a bounded quote `nice catch` and the template contains `{message}`
- **THEN** the resolved text contains `nice catch`

## ADDED Requirements

### Requirement: Alert layout follows the catalog item
The alert client SHALL apply `layout` `card` as compact content, `banner` as a wide strip using available width, and `fullscreen` as a splash using the Browser Source rectangle. The page background MUST remain transparent outside preview. Unknown layout values SHALL use `card`.

#### Scenario: Banner command
- **WHEN** a `!gg` alert arrives with `layout` `banner`
- **THEN** the visible splash uses a wide banner composition rather than the compact card
