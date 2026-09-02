# Config Store

## Purpose

Persists operator settings in `config.json`, applies safe defaults, validates updates, and never exposes secrets through the admin API.

## Requirements

### Requirement: Missing config file is created with defaults
When the configured path does not exist, the system SHALL write a default `config.json` and start with those defaults. Defaults SHALL include `server_port` 17877, all platforms disabled, overlay `max_messages` 30, `message_ttl_seconds` 20, font size 18 px, theme `default`, native and third-party emotes enabled, image previews disabled, `points_per_message` 1, and `day_reset_hour` 6.

#### Scenario: First launch
- **WHEN** CommRelay starts and `config.json` is absent
- **THEN** the file is created with prototype defaults including `points_per_message` 1 and `day_reset_hour` 6 and the process continues

### Requirement: Older files receive additive defaults
On load, omitted newer fields SHALL be filled with current defaults without discarding operator values that are already present.

#### Scenario: Legacy overlay without presets
- **WHEN** a config file has overlay theme, TTL, and limit fields but no `overlay.presets`
- **THEN** the store creates a Default preset from those fields and continues

#### Scenario: Legacy overlay without emotes block
- **WHEN** a config file omits `overlay.emotes`
- **THEN** Twitch, YouTube, VK, FFZ, BTTV, and 7TV emotes default to enabled

#### Scenario: Legacy file without stats fields
- **WHEN** a config file omits `points_per_message` or `day_reset_hour`
- **THEN** those fields default to 1 and 6 respectively without discarding other operator values

### Requirement: Invalid settings are rejected with field errors
The system SHALL reject invalid settings before persisting them. Validation SHALL cover port range 1–65535, overlay message count ≥ 1, TTL ≥ 0, font size 12–48 px, known display modes and themes, required channel values when a platform is enabled, YouTube connection/chat modes, image-preview bounds, `points_per_message` as an integer ≥ 0, and `day_reset_hour` as an integer 0–23. Presence of `overlay.page_opacity` SHALL be rejected so the overlay page stays transparent for OBS.

#### Scenario: Enabled Twitch without channel
- **WHEN** an update enables Twitch with an empty channel
- **THEN** the save is rejected and the `twitch_channel` field error is returned

#### Scenario: Page opacity is set
- **WHEN** an update includes `overlay.page_opacity`
- **THEN** the save is rejected with field `overlay_page_opacity`

#### Scenario: Day reset hour out of range
- **WHEN** an update sets `day_reset_hour` to 24
- **THEN** the save is rejected and the `day_reset_hour` field error is returned

### Requirement: Admin reads omit secrets
`GET /api/config` and successful config updates SHALL return a public view. OAuth access/refresh tokens, the Google client secret, and the SOCKS5 password MUST NOT appear in that JSON. The public view MAY report `has_client_secret`, `connected`, and `has_password` booleans.

#### Scenario: Config contains OAuth tokens
- **WHEN** the admin requests `GET /api/config`
- **THEN** the JSON has no `access_token`, `refresh_token`, `client_secret`, or SOCKS password values

### Requirement: Blank secret fields do not wipe stored secrets
When an update omits YouTube OAuth tokens/secret or the SOCKS5 password, the store SHALL keep the previously saved secret values.

#### Scenario: Overlay-only save
- **WHEN** the admin saves overlay settings without resending the YouTube refresh token
- **THEN** the stored refresh token remains unchanged

### Requirement: Active preset changes preserve unrelated configuration
The config store SHALL validate and persist a requested `overlay.active_preset_id` as one atomic mutation of the current stored configuration. The mutation MUST preserve every unrelated setting and secret and MUST NOT require the caller to resubmit a full config document.

#### Scenario: Activate existing preset
- **WHEN** the stored config contains preset `stream-main` and activation requests `stream-main`
- **THEN** only `overlay.active_preset_id` changes and the updated config is persisted through the existing atomic write path

#### Scenario: Concurrent cold settings already persisted
- **WHEN** platform or interface settings were saved before an active-preset request is handled
- **THEN** those latest stored values remain unchanged after activation

#### Scenario: Unknown preset
- **WHEN** activation requests an identifier not present in `overlay.presets`
- **THEN** the mutation is rejected and the stored config remains unchanged

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

### Requirement: hide_command_messages is a persisted operator flag
`config.json` SHALL store `hide_command_messages` as a boolean, default false. Omitted keys on load SHALL default to false. Public `GET /api/config` SHALL include the flag. Invalid non-boolean values SHALL be rejected with a field error.

#### Scenario: First launch
- **WHEN** a new config file is created
- **THEN** `hide_command_messages` is false

#### Scenario: Legacy file
- **WHEN** an existing config omits `hide_command_messages`
- **THEN** the store treats it as false without dropping other settings
