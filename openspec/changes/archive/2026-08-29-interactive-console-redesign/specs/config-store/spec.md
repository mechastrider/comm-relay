## Purpose

Add a narrow atomic mutation for immediate active-preset changes without changing the persisted configuration schema.

## ADDED Requirements

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
