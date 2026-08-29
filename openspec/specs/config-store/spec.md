# Config Store

## Purpose

Persists operator settings in `config.json`, applies safe defaults, validates updates, and never exposes secrets through the admin API.

## Requirements

### Requirement: Missing config file is created with defaults
When the configured path does not exist, the system SHALL write a default `config.json` and start with those defaults. Defaults SHALL include `server_port` 17877, all platforms disabled, overlay `max_messages` 30, `message_ttl_seconds` 20, font size 18 px, theme `default`, native and third-party emotes enabled, and image previews disabled.

#### Scenario: First launch
- **WHEN** CommRelay starts and `config.json` is absent
- **THEN** the file is created with prototype defaults and the process continues

### Requirement: Older files receive additive defaults
On load, omitted newer fields SHALL be filled with current defaults without discarding operator values that are already present.

#### Scenario: Legacy overlay without presets
- **WHEN** a config file has overlay theme, TTL, and limit fields but no `overlay.presets`
- **THEN** the store creates a Default preset from those fields and continues

#### Scenario: Legacy overlay without emotes block
- **WHEN** a config file omits `overlay.emotes`
- **THEN** Twitch, YouTube, VK, FFZ, BTTV, and 7TV emotes default to enabled

### Requirement: Invalid settings are rejected with field errors
The system SHALL reject invalid settings before persisting them. Validation SHALL cover port range 1–65535, overlay message count ≥ 1, TTL ≥ 0, font size 12–48 px, known display modes and themes, required channel values when a platform is enabled, YouTube connection/chat modes, and image-preview bounds. Presence of `overlay.page_opacity` SHALL be rejected so the overlay page stays transparent for OBS.

#### Scenario: Enabled Twitch without channel
- **WHEN** an update enables Twitch with an empty channel
- **THEN** the save is rejected and the `twitch_channel` field error is returned

#### Scenario: Page opacity is set
- **WHEN** an update includes `overlay.page_opacity`
- **THEN** the save is rejected with field `overlay_page_opacity`

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
