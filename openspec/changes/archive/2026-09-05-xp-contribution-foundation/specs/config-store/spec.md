## Purpose

Replace per-message score settings with a silent activity policy and keep day-reset and other operator settings unchanged.

## MODIFIED Requirements

### Requirement: Missing config file is created with defaults
When the configured path does not exist, the system SHALL write a default `config.json` and start with those defaults. Defaults SHALL include `server_port` 17877, all platforms disabled, overlay `max_messages` 30, `message_ttl_seconds` 20, font size 18 px, theme `default`, native and third-party emotes enabled, image previews disabled, `day_reset_hour` 6, `activity_interval_seconds` 300, `activity_session_limit` 10, and `activity_xp` 1. New files MUST NOT use `points_per_message` as a progress rule.

#### Scenario: First launch
- **WHEN** CommRelay starts and `config.json` is absent
- **THEN** the file is created with prototype defaults including activity interval 300, session limit 10, activity XP 1, and `day_reset_hour` 6 and the process continues

### Requirement: Older files receive additive defaults
On load, omitted newer fields SHALL be filled with current defaults without discarding operator values that are already present. A legacy `points_per_message` value MUST NOT grant XP on each message. Omitted activity fields SHALL default to interval 300, session limit 10, and XP 1.

#### Scenario: Legacy overlay without presets
- **WHEN** a config file has overlay theme, TTL, and limit fields but no `overlay.presets`
- **THEN** the store creates a Default preset from those fields and continues

#### Scenario: Legacy overlay without emotes block
- **WHEN** a config file omits `overlay.emotes`
- **THEN** Twitch, YouTube, VK, FFZ, BTTV, and 7TV emotes default to enabled

#### Scenario: Legacy file without stats fields
- **WHEN** a config file omits `day_reset_hour` and all activity fields
- **THEN** `day_reset_hour` defaults to 6 and activity defaults to interval 300, session limit 10, and XP 1 without discarding other operator values

#### Scenario: Legacy points per message
- **WHEN** a config file contains `points_per_message` 1
- **THEN** ingest does not add 1 XP per message and activity defaults apply unless activity fields are already present

### Requirement: Invalid settings are rejected with field errors
The system SHALL reject invalid settings before persisting them. Validation SHALL cover port range 1–65535, overlay message count ≥ 1, TTL ≥ 0, font size 12–48 px, known display modes and themes, required channel values when a platform is enabled, YouTube connection/chat modes, image-preview bounds, `day_reset_hour` as an integer 0–23, and `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` as integers ≥ 0. Presence of `overlay.page_opacity` SHALL be rejected so the overlay page stays transparent for OBS.

#### Scenario: Enabled Twitch without channel
- **WHEN** an update enables Twitch with an empty channel
- **THEN** the save is rejected and the `twitch_channel` field error is returned

#### Scenario: Page opacity is set
- **WHEN** an update includes `overlay.page_opacity`
- **THEN** the save is rejected with field `overlay_page_opacity`

#### Scenario: Activity interval negative
- **WHEN** an update sets `activity_interval_seconds` to -1
- **THEN** the save is rejected and the `activity_interval_seconds` field error is returned

#### Scenario: Day reset hour out of range
- **WHEN** an update sets `day_reset_hour` to 24
- **THEN** the save is rejected and the `day_reset_hour` field error is returned

## ADDED Requirements

### Requirement: Public config exposes activity settings
`GET /api/config` and successful config updates SHALL include `activity_interval_seconds`, `activity_session_limit`, and `activity_xp`. They MUST NOT present `points_per_message` as an operator-controlled progress setting.

#### Scenario: Read activity settings
- **WHEN** the admin requests `GET /api/config` after a first-run default file
- **THEN** the public JSON includes activity interval 300, session limit 10, and activity XP 1
