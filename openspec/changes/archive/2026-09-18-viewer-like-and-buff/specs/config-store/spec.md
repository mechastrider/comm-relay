## ADDED Requirements

### Requirement: Buff cap fields have additive defaults
On load, omitted `buffs_per_award_per_viewer` SHALL default to 1 and omitted `buff_max_unique_viewers` SHALL default to 5 without discarding other operator values. Both MUST be integers ≥ 0. Public config JSON SHALL include them. They MUST NOT migrate into SQLite.

#### Scenario: Legacy config without buff caps
- **WHEN** a config file omits both buff cap fields
- **THEN** the store uses per-viewer cap 1 and unique-viewer cap 5 and continues

#### Scenario: Zero unique cap is stored
- **WHEN** the operator saves `buff_max_unique_viewers` 0
- **THEN** the value persists and successful buffing is disabled per `viewer-social-commands`

## MODIFIED Requirements

### Requirement: Invalid settings are rejected with field errors
The system SHALL reject invalid settings before persisting them. Validation SHALL cover port range 1–65535, overlay message count ≥ 1, TTL ≥ 0, font size 12–48 px, known display modes and themes, required channel values when a platform is enabled, YouTube connection/chat modes, image-preview bounds, `day_reset_hour` as an integer 0–23, and `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` as integers ≥ 0. Validation SHALL additionally cover `buffs_per_award_per_viewer` and `buff_max_unique_viewers` as integers ≥ 0. Presence of `overlay.page_opacity` SHALL be rejected so the overlay page stays transparent for OBS.

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

#### Scenario: Negative unique cap
- **WHEN** an update sets `buff_max_unique_viewers` to -1
- **THEN** the save is rejected and the `buff_max_unique_viewers` field error is returned
