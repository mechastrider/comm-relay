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
