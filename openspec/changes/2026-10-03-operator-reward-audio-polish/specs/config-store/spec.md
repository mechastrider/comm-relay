## ADDED Requirements

### Requirement: Persistent application command audio preference
The config SHALL expose `admin.command_sound_enabled` as a boolean. Fresh configurations and existing configurations omitting this field MUST resolve to true. Explicit false MUST survive save, reload, restart, and unrelated settings updates. Older clients omitting the field during config updates MUST preserve the stored preference.

#### Scenario: Upgrade without a preference
- **WHEN** an existing config omits `admin.command_sound_enabled`
- **THEN** app command audio is enabled

#### Scenario: Explicit disable persists
- **WHEN** the operator disables app command audio and restarts the application
- **THEN** the setting remains false

#### Scenario: Older settings client
- **WHEN** a config update omits `admin.command_sound_enabled`
- **THEN** the previously saved value is retained
