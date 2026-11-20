## ADDED Requirements

### Requirement: Experimental AI configuration is opt-in and portable
Config SHALL add `features.experimental_ai_messages` default false, and a separate `ai_messages` settings object for LLM/TTS profiles, stream context, moderation denylist, limits and character/image bindings. Missing settings MUST preserve existing installations. Disabled settings SHALL survive save/reload. Enabling SHALL validate required model, credential availability, catalog and trigger conflicts before starting admission. Presets SHALL allow operator URL/model selection without promising every upstream model capability. Credentials SHALL be referenced by environment variable name, not persisted in public config. Settings changes SHALL invalidate pending jobs to prevent mixing policy/catalog revisions; active AI playback SHALL be canceled when disabled. Settings and secrets MUST remain server-authoritative.

#### Scenario: Upgrade existing installation
- **WHEN** config has no features section
- **THEN** the AI feature stays disabled and no provider is contacted

#### Scenario: Missing secret
- **WHEN** enabling references an unset credential environment variable
- **THEN** settings validation explains the missing reference without exposing any secret and admission remains disabled

#### Scenario: Disable and enable later
- **WHEN** an operator disables the configured feature and later enables it again
- **THEN** settings remain available but old pending jobs do not resume

#### Scenario: Save rejected by validation
- **WHEN** an operator saves settings that fail validation
- **THEN** the admin keeps the draft, shows the error next to the save action and moves focus to the first invalid field or its message

#### Scenario: Understand AI errors in the selected language
- **WHEN** AI validation, a provider request or a job reports an error
- **THEN** the admin renders known errors in the selected RU/EN interface language with red error styling, separate from neutral hints and timestamps
- **AND** an empty character catalog explicitly instructs the operator to add a character before enabling AI messages
- **AND** unknown errors retain their diagnostic detail with a localized error label

#### Scenario: Consistent experimental settings appearance
- **WHEN** an operator opens experimental AI settings
- **THEN** panels, headings, fields, checkboxes and tabs use the shared settings visual language and theme tokens
- **AND** tabs support arrow-key navigation and expose their selected panel
- **AND** populated character forms remain scrollable without horizontal overflow at desktop and narrow widths
