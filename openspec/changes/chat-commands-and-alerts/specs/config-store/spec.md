## ADDED Requirements

### Requirement: hide_command_messages is a persisted operator flag
`config.json` SHALL store `hide_command_messages` as a boolean, default false. Omitted keys on load SHALL default to false. Public `GET /api/config` SHALL include the flag. Invalid non-boolean values SHALL be rejected with a field error.

#### Scenario: First launch
- **WHEN** a new config file is created
- **THEN** `hide_command_messages` is false

#### Scenario: Legacy file
- **WHEN** an existing config omits `hide_command_messages`
- **THEN** the store treats it as false without dropping other settings
