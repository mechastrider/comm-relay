## ADDED Requirements

### Requirement: hide_command_cooldown_overlay is a persisted operator flag
`config.json` SHALL store `hide_command_cooldown_overlay` as a boolean, default false. Omitted keys on load SHALL default to false (overlay shows a short cooldown row). Public `GET /api/config` SHALL include the flag. Invalid non-boolean values SHALL be rejected with a field error. The field is installation-global; overlay presets MUST NOT override it.

#### Scenario: First launch
- **WHEN** a new config file is created
- **THEN** `hide_command_cooldown_overlay` is false

#### Scenario: Legacy file
- **WHEN** an existing config omits `hide_command_cooldown_overlay`
- **THEN** the store treats it as false without dropping other settings

#### Scenario: Save hide overlay cooldown
- **WHEN** the operator saves `hide_command_cooldown_overlay` true
- **THEN** public config returns true and overlay clients receive the updated flag
