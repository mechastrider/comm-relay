## MODIFIED Requirements

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
