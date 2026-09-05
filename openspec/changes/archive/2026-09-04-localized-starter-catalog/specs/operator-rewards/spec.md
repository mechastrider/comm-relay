## MODIFIED Requirements

### Requirement: Locale-aware one-time starter awards
On first initialization of a new local database, the system SHALL insert deletable starter award types with stable ids `joke` (10), `advice` (50), `spotter` (25), `intel` (30), `expert` (40), `meme` (20), `clutch` (50), and `mvp` (100). Display names and splash templates SHALL match the operator's configured `admin.time_locale` at initialization time (`ru-RU` or `en-GB`). Splash templates MUST include `{viewer}` and `{points}`. Award ids MUST remain stable across locales. After initialization completes, the catalog MUST be treated as ordinary user-owned data: changing `admin.time_locale`, editing rows, deleting seeds, or leaving an empty catalog MUST NOT cause automatic translation, restoration, or re-insertion. Existing databases that already contained starter awards before this behavior shipped MUST be adopted without modifying any award fields.

#### Scenario: Fresh Russian database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `ru-RU`
- **THEN** all eight starter awards exist with Russian display names and splash templates and are deletable

#### Scenario: Fresh English database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `en-GB`
- **THEN** all eight starter awards exist with the existing English display names and splash templates

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

#### Scenario: Locale change after initialization
- **WHEN** the operator changes `admin.time_locale` after the starter catalog was initialized
- **THEN** existing award names and splash templates remain unchanged

#### Scenario: Existing database adoption
- **WHEN** CommRelay upgrades an installation that already had migration-era starter awards
- **THEN** award ids, names, points, and splash templates are unchanged

#### Scenario: Existing database has no bootstrap marker
- **WHEN** CommRelay opens an already migrated database without starter-catalog bootstrap metadata
- **THEN** the existing award catalog is adopted unchanged and marked initialized

#### Scenario: Resume interrupted fresh-database bootstrap
- **WHEN** a new database has a persisted pending starter locale but catalog initialization did not finish
- **THEN** the next startup completes starter award initialization in the persisted locale
