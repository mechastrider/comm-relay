# OBS Overlay

## Purpose

Renders aggregated chat in an OBS Browser Source rectangle: transparent page, capped queue, optional TTL, named presets, and safe fragment rendering.

## Requirements

### Requirement: Overlay page background stays transparent
The overlay document SHALL use a transparent page background so OBS Browser Source does not show a solid rectangle behind chat. The system MUST reject config that tries to set page opacity.

#### Scenario: Default overlay CSS
- **WHEN** OBS loads `/overlay`
- **THEN** `html` and `body` backgrounds are transparent

### Requirement: Visible queue is capped and may expire
The overlay SHALL keep at most `max_messages` rows (default 30). When `message_ttl_seconds` is greater than zero, rows SHALL leave after that TTL (default 20 seconds). TTL `0` SHALL keep messages until they fall off the cap.

#### Scenario: Cap exceeded
- **WHEN** more than `max_messages` live rows are shown
- **THEN** the oldest row is removed so the visible count stays at the cap

#### Scenario: TTL elapsed
- **WHEN** a row has been visible longer than `message_ttl_seconds` and TTL is not zero
- **THEN** that row is removed with the leave animation

### Requirement: Appearance follows the active preset and optional URL overrides
Overlay look SHALL come from `overlay.presets` and `active_preset_id` (theme, display mode, font size, style tokens, panel image). When `preset` is absent, `/overlay` and `/leaderboard` MUST follow the current `active_preset_id`, including changes delivered through `overlay_settings`. When a valid `preset` is present, that source MUST remain pinned to the named preset. Query parameters `max_messages`, `message_ttl_seconds`, `font_size_px`, `display_mode`, and `theme` SHALL override matching values when valid so one process can feed multiple OBS scenes.

#### Scenario: Unpinned source follows activation
- **WHEN** an overlay or leaderboard URL has no `preset` query and the active preset changes
- **THEN** the source applies the newly active preset without requiring its OBS URL to be replaced

#### Scenario: Pinned preset query
- **WHEN** OBS loads `/overlay?preset=<id>` for an existing preset and another preset becomes active
- **THEN** the source continues using the preset named in its URL

#### Scenario: Invalid preset query
- **WHEN** the URL names a preset that does not exist
- **THEN** the source falls back to the active preset without failing to render

#### Scenario: Invalid theme query
- **WHEN** the URL has `theme=not-a-theme`
- **THEN** the overlay keeps the configured theme

### Requirement: Supported themes are explicit
The overlay SHALL support themes `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`, and display modes `normal` and `compact`.

#### Scenario: Cockpit popups
- **WHEN** theme is `cockpit_popups`
- **THEN** messages render as separate HUD popups rather than a single shared panel

### Requirement: Fragments render without HTML injection
Text fragments SHALL become text nodes. Emote and image-link fragments SHALL become constrained `<img>` elements with safe URLs. Unsupported or unsafe fragments SHALL fall back to text. The overlay MUST NOT assign untrusted strings to `innerHTML`.

#### Scenario: Emote fragment
- **WHEN** a message includes an `emote` fragment with an https URL
- **THEN** the overlay shows an inline image and the neighboring text as text nodes

#### Scenario: Unsafe URL
- **WHEN** a fragment URL is not `http` or `https`
- **THEN** the overlay does not create an image from that URL

### Requirement: Overlay restores recent history after reload
After the overlay loads, it SHALL fetch recent messages from `GET /api/messages/recent` and then follow `/ws`. History restore failure MUST NOT prevent live WebSocket updates.

#### Scenario: Browser Source refresh
- **WHEN** OBS reloads the overlay while history contains messages
- **THEN** those recent messages appear before new live lines

### Requirement: Overlay reconnects with backoff
If the WebSocket drops, the overlay SHALL reconnect with exponential backoff starting at 1s and capped at 30s.

#### Scenario: Server restarts
- **WHEN** `/ws` closes
- **THEN** the overlay attempts to reconnect without operator action

### Requirement: Platform icon sits with the display name
When the platform marker is `icon` or `both`, the overlay SHALL render the platform icon immediately before the display name inside the message identity, in every supported theme. The icon MUST NOT occupy a leftover grid cell (for example under the avatar) in HUD themes.

#### Scenario: HUD popup with icon marker
- **WHEN** the theme is `cockpit_popups` or `g_rebels_popups` and the platform marker is `icon` or `both`
- **THEN** the platform icon appears on the same row as the display name, immediately before it

#### Scenario: Stripe hides the icon
- **WHEN** the platform marker is `stripe` or `none`
- **THEN** the platform icon is not shown

### Requirement: G-Rebels default platform marker includes the icon
New presets and theme-default style for `g_rebels_popups` SHALL use platform marker `both`. Existing presets that already stored a marker MUST keep that stored value.

#### Scenario: New G-Rebels preset
- **WHEN** the operator creates a preset with theme `g_rebels_popups` without overriding the platform marker
- **THEN** the marker is `both`

### Requirement: Preview backgrounds are a shared contrast set
When `/overlay` is loaded with a preview query, `preview_background` SHALL apply the same page backdrop for every theme: `white`, `checker`, `scene`, or `dark`. Legacy value `busy` SHALL be treated as `scene`. Missing or invalid values SHALL use `scene`. Outside preview, `html` and `body` backgrounds MUST remain transparent. Theme chrome MAY still cover parts of the backdrop.

#### Scenario: White preview backdrop
- **WHEN** the overlay URL includes a preview flag and `preview_background=white`
- **THEN** the page backdrop is solid white behind transparent overlay regions

#### Scenario: Legacy busy query
- **WHEN** the overlay URL includes a preview flag and `preview_background=busy`
- **THEN** the page backdrop is the same game-footage pattern as `scene`

#### Scenario: HUD theme preview fills the rectangle
- **WHEN** the theme is `cockpit_popups` or `g_rebels_popups` and preview uses `preview_background=scene`
- **THEN** the game-footage backdrop fills the Browser Source rectangle behind transparent HUD regions rather than the browser default white page

#### Scenario: Live OBS overlay
- **WHEN** `/overlay` loads without a preview query
- **THEN** the page background stays transparent

### Requirement: Admin source copy distinguishes following and pinned URLs
Studio SHALL offer an unpinned URL that follows the active preset as the primary copy action for overlay and leaderboard sources. It SHALL also offer an explicitly labeled pinned URL for operators who require a scene-specific preset. Existing URLs with `preset` MUST remain valid.

#### Scenario: Copy default overlay source
- **WHEN** the operator uses the primary copy action for the chat overlay
- **THEN** the copied URL omits `preset` and is labeled as following the active preset

#### Scenario: Copy pinned leaderboard source
- **WHEN** the operator chooses the pinned copy option for a leaderboard preset
- **THEN** the copied URL includes that preset's identifier and is labeled as pinned
