## MODIFIED Requirements

### Requirement: Locale-aware one-time starter commands
On first initialization of a new local database, the system SHALL insert enabled deletable starter commands `gg` and `hi` with cooldown 30 seconds, default splash templates using `{viewer}`, and a built-in tone. Splash text SHALL match the operator's configured `admin.time_locale` at initialization time (`ru-RU` or `en-GB`). Command ids and triggers MUST remain `gg` and `hi` in every locale. After initialization completes, the catalog MUST be treated as ordinary user-owned data: changing `admin.time_locale`, editing rows, deleting seeds, or leaving an empty catalog MUST NOT cause automatic translation, restoration, or re-insertion. Existing databases that already contained starter commands before this behavior shipped MUST be adopted without modifying any command fields.

#### Scenario: Fresh Russian database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `ru-RU`
- **THEN** the catalog contains `gg` and `hi` with Russian splash templates and both are deletable

#### Scenario: Fresh English database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `en-GB`
- **THEN** the catalog contains `gg` and `hi` with the existing English splash templates and both are deletable

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded `gg` command
- **THEN** `!gg` no longer matches and a process restart MUST NOT recreate it

#### Scenario: Locale change after initialization
- **WHEN** the operator changes `admin.time_locale` after the starter catalog was initialized
- **THEN** existing command splash templates remain unchanged

#### Scenario: Existing database adoption
- **WHEN** CommRelay upgrades an installation that already had migration-era starter commands
- **THEN** command ids, triggers, and splash templates are unchanged

#### Scenario: Existing database has no bootstrap marker
- **WHEN** CommRelay opens an already migrated database without starter-catalog bootstrap metadata
- **THEN** the existing command catalog is adopted unchanged and marked initialized

#### Scenario: Resume interrupted fresh-database bootstrap
- **WHEN** a new database has a persisted pending starter locale but catalog initialization did not finish
- **THEN** the next startup completes starter command initialization in the persisted locale
