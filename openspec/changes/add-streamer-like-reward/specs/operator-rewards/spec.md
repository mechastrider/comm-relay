## MODIFIED Requirements

### Requirement: Locale-aware one-time starter awards
On first initialization of a new local database, the system SHALL insert deletable starter award types with stable ids `like` (5), `joke` (10), `advice` (25), `spotter` (25), `intel` (30), `expert` (40), `meme` (20), `clutch` (50), and `mvp` (100). The `like` award SHALL be named `Лайк от стримера` for `ru-RU` and `Streamer Like` for `en-GB`. All display names and splash templates SHALL match the operator's configured `admin.time_locale` at initialization time (`ru-RU` or `en-GB`). Splash templates MUST include `{viewer}` and `{points}`. Award ids MUST remain stable across locales. After initialization completes, the catalog MUST be treated as ordinary user-owned data: changing `admin.time_locale`, editing rows, deleting seeds, or leaving an empty catalog MUST NOT cause automatic translation, restoration, re-insertion, or points changes. Existing databases that already contained starter awards before this behavior shipped MUST be adopted without adding `like` or modifying any award fields.

#### Scenario: Fresh Russian database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `ru-RU`
- **THEN** all nine starter awards exist with Russian display names and splash templates and are deletable
- **AND** `like` is named `Лайк от стримера`, grants 5 points, uses the `soft` sound, and displays for 5000 milliseconds
- **AND** `advice` grants 25 points

#### Scenario: Fresh English database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `en-GB`
- **THEN** all nine starter awards exist with English display names and splash templates
- **AND** `like` is named `Streamer Like`, grants 5 points, uses the `soft` sound, and displays for 5000 milliseconds
- **AND** `advice` grants 25 points

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

#### Scenario: Locale change after initialization
- **WHEN** the operator changes `admin.time_locale` after the starter catalog was initialized
- **THEN** existing award names and splash templates remain unchanged

#### Scenario: Existing database adoption
- **WHEN** CommRelay upgrades an installation that already had migration-era starter awards
- **THEN** award ids, names, points, and splash templates are unchanged
- **AND** the `like` award is not inserted automatically

#### Scenario: Existing database has no bootstrap marker
- **WHEN** CommRelay opens an already migrated database without starter-catalog bootstrap metadata
- **THEN** the existing award catalog is adopted unchanged and marked initialized

#### Scenario: Resume interrupted fresh-database bootstrap
- **WHEN** a new database has a persisted pending starter locale but catalog initialization did not finish
- **THEN** the next startup completes starter award initialization in the persisted locale

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant because the same message `id` was already rewarded. Each successful grant SHALL add XP and enqueue another alert.

#### Scenario: Joke then advice
- **WHEN** the operator grants the fresh-catalog Joke and then Advice on the same message
- **THEN** XP increases by 10 then by 25 and two alerts are queued in order
