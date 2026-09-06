# Overlay Alerts

## Purpose

Shows queued on-stream splashes (avatar, text, sound) in a dedicated OBS Browser Source so chat and leaderboard stay separate.

## Requirements

### Requirement: Alert page is a transparent themed Browser Source
`GET /overlay/alert` (with and without trailing slash) SHALL serve a transparent page registered before any catch-all `/overlay/` file server. The page SHALL implement every current overlay theme using the same scene preset/theme as other on-stream surfaces. Outside preview, `html` and `body` backgrounds MUST remain transparent.

#### Scenario: Default load
- **WHEN** OBS loads `/overlay/alert`
- **THEN** the page background is transparent and the active overlay theme classes apply

#### Scenario: Theme coverage
- **WHEN** the active preset theme is any supported overlay theme
- **THEN** the alert surface renders with that theme's tokens rather than an unthemed fallback

### Requirement: Splashes are queued and do not preempt
The alert client SHALL show exactly one splash at a time and MUST NOT replace or cut short the visible splash. Pending award and command alerts SHALL keep FIFO order within separate lanes. After the visible splash ends, the oldest pending award SHALL run; when no award waits, the oldest non-expired command SHALL run. A command waiting for more than 10 seconds SHALL expire. The total pending capacity SHALL remain 20. At capacity, a new award SHALL displace the oldest pending command when one exists, otherwise the oldest pending award; a new command SHALL replace the oldest pending command but MUST NOT displace an award. An alert without a recognized `source` SHALL use command scheduling for compatibility.

#### Scenario: Award arrives behind a visible command
- **WHEN** one command is visible, two commands wait, and an award arrives
- **THEN** the visible command finishes and the award is shown before either waiting command

#### Scenario: Two fires
- **WHEN** two alerts arrive one second apart with duration 5 seconds
- **THEN** the first remains visible for its duration and the next eligible pending alert starts afterward

#### Scenario: Empty
- **WHEN** no alert is visible or waiting
- **THEN** the page shows no splash chrome

#### Scenario: Command loses context
- **WHEN** a pending command has waited more than 10 seconds
- **THEN** it is removed without being shown or playing sound

#### Scenario: Full award-protected queue
- **WHEN** all 20 pending items are awards and a command arrives
- **THEN** the incoming command is discarded and no award is removed

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

### Requirement: Alert layout follows the catalog item
The alert client SHALL apply `layout` `card` as compact content, `banner` as a wide strip using available width, and `fullscreen` as a splash using the Browser Source rectangle. The page background MUST remain transparent outside preview. Unknown layout values SHALL use `fullscreen`.

#### Scenario: Banner command
- **WHEN** a `!gg` alert arrives with `layout` `banner`
- **THEN** the visible splash uses a wide banner composition rather than the compact card

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

### Requirement: Alert client reconnects without restoring old splashes
After load, the alert page SHALL connect to `/ws` and MUST NOT replay historical alerts from HTTP. If the socket drops, it SHALL reconnect with the same backoff family as other overlays. Missed alerts during disconnect are not replayed.

#### Scenario: Reload mid-splash
- **WHEN** OBS reloads `/overlay/alert` during a visible splash
- **THEN** the page starts empty and only shows alerts received after reconnect

### Requirement: Award splashes explain the recognized contribution
Command and award splashes SHALL use distinct variants in every supported overlay theme. An award splash SHALL render the award name, viewer name, positive points, and optional short source-message quote as text nodes. A command splash SHALL retain its existing resolved template presentation. Missing quote or avatar data MUST fall back without empty reserved space. Reduced-motion mode SHALL replace decorative award motion with a static emphasis.

#### Scenario: Award with quote
- **WHEN** an award alert contains `award_name` `Spotter`, `points` 25, and a message quote
- **THEN** the alert visibly identifies Spotter, the viewer, `+25`, and the quote without HTML interpretation

#### Scenario: Award without quote
- **WHEN** an award alert has no message text
- **THEN** the award variant shows its name, viewer, and points without an empty quote container

### Requirement: Alert typography follows its surface font
The alert page SHALL resolve font size from `surfaces.alerts.font_size_px` when present (12–48), otherwise from the preset `font_size_px`. Query `font_size_px` SHALL override the resolved alert font when valid.

#### Scenario: Stored alerts font
- **WHEN** the active preset has `font_size_px` 18 and `surfaces.alerts.font_size_px` 28
- **THEN** alert splash text renders at 28 px

### Requirement: Alert chrome uses its surface opacity
The alert page SHALL resolve panel opacity from `surfaces.alerts.panel_opacity`, normally falling back to the preset shared `style.panel_opacity`. When a legacy cockpit preset has shared zero and no alerts override, alert chrome SHALL retain that theme's historical glass color and alpha; an explicit alerts value, including zero, SHALL win. It MUST apply the resolved appearance to alert background/chrome rather than the whole document, text, avatar, or media. The page background MUST remain transparent outside preview.

#### Scenario: Translucent alert chrome
- **WHEN** the active preset has alert panel opacity `0.35`
- **THEN** alert chrome uses 35 percent opacity while its text remains fully rendered and the page stays transparent

#### Scenario: Untouched legacy cockpit alert
- **WHEN** a cockpit preset has shared opacity `0` and no alerts override
- **THEN** alert chrome retains that theme's historical dark glass while the page outside it stays transparent

### Requirement: Alert frames carry the resolved viewer portrait
Award and command alert `avatar_url` SHALL use the same resolved portrait as viewer list and chat fill (custom overlay-asset URL when custom portraits are enabled, otherwise cached local URL, otherwise last-seen remote URL). Absence of a portrait SHALL omit `avatar_url`. Primary splash graphics remain custom `image_asset` or the built-in emblem as already specified; resolved `avatar_url` is for identity chrome only.

#### Scenario: Award without custom alert image uses resolved portrait in identity chrome
- **WHEN** Advice is granted to a viewer who has a cached platform portrait and no award `image_asset`
- **THEN** the splash uses the built-in medal as the primary graphic and `avatar_url` is the local cached portrait URL when identity chrome needs it
