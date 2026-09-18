## ADDED Requirements

### Requirement: Locale-aware on-point starter award
On first on-point catalog initialization of a database that does not already contain award id `on_point`, the system SHALL insert a deletable starter award `on_point` with 20 points, the `ping` sound, and 5000 millisecond duration. Display names and splash templates SHALL match the initialization locale: `В точку` / `В точку: {viewer}! +{points}` for `ru-RU` and `On Point` / `On Point: {viewer}! +{points}` for `en-GB`. Existing databases that already contain `on_point` MUST be adopted without renaming or changing points. After initialization, the row is ordinary user-owned data: deleting it MUST NOT cause a later restart to recreate it.

#### Scenario: Fresh Russian database
- **WHEN** on-point catalog initialization runs while `admin.time_locale` is `ru-RU` and `on_point` is absent
- **THEN** award `on_point` exists, is named `В точку`, grants 20 points, uses the `ping` sound, displays for 5000 milliseconds, and is deletable

#### Scenario: Fresh English database
- **WHEN** on-point catalog initialization runs while `admin.time_locale` is `en-GB` and `on_point` is absent
- **THEN** award `on_point` exists, is named `On Point`, grants 20 points, and is deletable

#### Scenario: Existing on_point kept
- **WHEN** an upgraded database already has award id `on_point`
- **THEN** its name and points are unchanged

#### Scenario: Deleted on_point stays gone
- **WHEN** the operator deletes award `on_point` after initialization
- **THEN** a process restart MUST NOT recreate it

## MODIFIED Requirements

### Requirement: Locale-aware one-time starter awards
On first initialization of a new local database, the system SHALL insert deletable starter award types with stable ids `like` (5), `joke` (10), `advice` (25), `spotter` (25), `intel` (30), `expert` (40), `meme` (20), `on_point` (20), `clutch` (50), and `mvp` (100). The `like` award SHALL be named `Лайк от стримера` for `ru-RU` and `Streamer Like` for `en-GB`. The `on_point` award SHALL be named `В точку` for `ru-RU` and `On Point` for `en-GB`. All display names and splash templates SHALL match the operator's configured `admin.time_locale` at initialization time (`ru-RU` or `en-GB`). Splash templates MUST include `{viewer}` and `{points}`. Award ids MUST remain stable across locales. After initialization completes, the catalog MUST be treated as ordinary user-owned data: changing `admin.time_locale`, editing rows, deleting seeds, or leaving an empty catalog MUST NOT cause automatic translation, restoration, re-insertion, or points changes. Existing databases that already contained starter awards before the Streamer Like behavior shipped MUST be adopted without adding `like` or modifying any award fields. Award `on_point` on those databases SHALL follow the separate on-point catalog initialization requirement.

#### Scenario: Fresh Russian database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `ru-RU`
- **THEN** all ten starter awards exist with Russian display names and splash templates and are deletable
- **AND** `like` is named `Лайк от стримера`, grants 5 points, uses the `soft` sound, and displays for 5000 milliseconds
- **AND** `on_point` is named `В точку`, grants 20 points, uses the `ping` sound, and displays for 5000 milliseconds
- **AND** `advice` grants 25 points

#### Scenario: Fresh English database
- **WHEN** CommRelay opens a new database while `admin.time_locale` is `en-GB`
- **THEN** all ten starter awards exist with English display names and splash templates
- **AND** `like` is named `Streamer Like`, grants 5 points, uses the `soft` sound, and displays for 5000 milliseconds
- **AND** `on_point` is named `On Point`, grants 20 points, uses the `ping` sound, and displays for 5000 milliseconds
- **AND** `advice` grants 25 points

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

#### Scenario: Locale change after initialization
- **WHEN** the operator changes `admin.time_locale` after the starter catalog was initialized
- **THEN** existing award names and splash templates remain unchanged

#### Scenario: Existing database adoption
- **WHEN** CommRelay upgrades an installation that already had migration-era starter awards
- **THEN** award ids, names, points, and splash templates of those existing rows are unchanged
- **AND** the `like` award is not inserted by starter-catalog adoption
- **AND** `on_point` is inserted only by on-point catalog initialization when that id is absent

#### Scenario: Existing database has no bootstrap marker
- **WHEN** CommRelay opens an already migrated database without starter-catalog bootstrap metadata
- **THEN** the existing award catalog is adopted unchanged and marked initialized

#### Scenario: Resume interrupted fresh-database bootstrap
- **WHEN** a new database has a persisted pending starter locale but catalog initialization did not finish
- **THEN** the next startup completes starter award initialization in the persisted locale

### Requirement: Reward controls appear on lines with a stable identity
Admin Live messages and `/dock/messages` SHALL offer a Reward control when the line has a non-empty `platform` and `user_id`. The control SHALL open a short picker of award types other than `like` (not one button per remaining type on the row). Choosing a type SHALL call `POST /api/awards/grant`. When the catalog contains award id `like`, those same rows SHALL also show a Streamer Like control that grants `like` with one activation and the same `platform`, `user_id`, and optional message snapshot as Reward. Lines without `user_id` MUST NOT show Reward or Streamer Like. When `like` is absent from the catalog, Streamer Like MUST NOT appear and the picker SHALL list remaining types as today. The dock MUST NOT offer command or award catalog editing.

#### Scenario: Dock reward
- **WHEN** a Twitch message with `user_id` is shown in the dock and the operator picks Advice
- **THEN** the client posts grant with that platform, user id, and the Advice id

#### Scenario: Dock streamer like
- **WHEN** a Twitch message with `user_id` is shown in the dock while award `like` exists and the operator activates Streamer Like
- **THEN** the client posts grant with that platform, user id, and award id `like` without opening the picker

#### Scenario: Like omitted from picker
- **WHEN** the operator opens Reward while award `like` exists
- **THEN** the picker does not list `like`
- **AND** other award types including `on_point` remain listed

#### Scenario: Like seed deleted
- **WHEN** award `like` is absent from the catalog
- **THEN** Streamer Like is not offered
- **AND** Reward still opens the picker of remaining types

#### Scenario: No identity
- **WHEN** a displayed line has no `user_id`
- **THEN** Reward and Streamer Like are not offered
