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
Overlay look SHALL come from `overlay.presets` / `active_preset_id` (theme, display mode, font size, style tokens, panel image). Query parameters `preset`, `max_messages`, `message_ttl_seconds`, `font_size_px`, `display_mode`, and `theme` SHALL override the matching values when valid so one process can feed multiple OBS scenes.

#### Scenario: Preset query
- **WHEN** OBS loads `/overlay?preset=<id>` for an existing preset
- **THEN** that preset's theme, queue, and style are applied

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
