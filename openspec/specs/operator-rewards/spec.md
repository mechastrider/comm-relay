# Operator Rewards

## Purpose

Lets the operator define award types and grant them from a live chat line in admin or the OBS dock, adding XP and an on-stream alert.

## Requirements

### Requirement: Operator can manage an award-type catalog
The system SHALL persist award types in local SQLite as a list separate from chat commands. Each award type SHALL have a unique id, display name, positive integer `points`, splash text template, built-in sound id or silence, optional `image_asset` and `sound_file` filenames that MAY be null, `sound_volume` 0–100 (default 70), `layout` of `card`, `banner`, or `fullscreen` (default `fullscreen`), optional `image_fit` of `cover`, `contain`, `fill`, or `tile` (default `contain`), optional `image_size_pct` 25–300 (default 100), and splash duration. `GET /api/awards` SHALL list these fields. Mutations SHALL be `POST /api/awards/create`, `POST /api/awards/update`, and `POST /api/awards/delete` with identifiers in the JSON body. Create and update SHALL accept the media, volume, layout, image-fit, and image-size fields. Empty media fields SHALL clear a previous file reference. The operator MUST be able to delete any award type, including seeds.

#### Scenario: Create award
- **WHEN** the operator creates an award named `Clutch` with 25 points
- **THEN** `GET /api/awards` includes it and Reward pickers list it

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

#### Scenario: Save custom sound
- **WHEN** the operator updates Joke with a stored `sound_file` filename and `sound_volume` 50
- **THEN** `GET /api/awards` returns those values and a later Joke grant plays that file at 50 percent

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

### Requirement: Operator can grant an award from a chat line
`POST /api/awards/grant` SHALL accept `platform`, `user_id`, and `award_id`, plus optional `message_id` and `message_text` from the selected row. The system SHALL resolve the canonical viewer, add the award `points` to all-time, current-session, and current-day `xp`, append one interaction event, and broadcast one award alert. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award. The server MUST trim `message_text` and limit the transient quote to 280 Unicode code points before broadcast. It MUST NOT persist the quote. Missing source-message fields MUST NOT prevent a valid award grant.

#### Scenario: Grant from a stable message
- **WHEN** the operator grants Advice from a row with `platform`, `user_id`, `message_id`, and message text
- **THEN** XP increases, the interaction event records the message reference, and the award alert includes the bounded transient quote

#### Scenario: Grant joke
- **WHEN** the operator grants Joke to a Twitch user id that already has a viewer
- **THEN** that viewer's XP increases by 10 and one award alert is broadcast

#### Scenario: Grant without a stable message id
- **WHEN** the operator grants an award from a row with a stable viewer identity but no `message_id`
- **THEN** the award succeeds and its alert has no highlightable message reference

#### Scenario: Oversized message snapshot
- **WHEN** a grant includes `message_text` longer than 280 Unicode code points
- **THEN** the award succeeds and the broadcast quote is safely truncated without splitting invalid UTF-8

#### Scenario: Empty user id
- **WHEN** grant is called with an empty `user_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Empty platform
- **WHEN** grant is called with an empty `platform`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown award
- **WHEN** grant is called with an absent or unknown `award_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown viewer identity
- **WHEN** the platform and user id are valid but no viewer exists yet
- **THEN** the system may create the viewer through the ingest identity path and then apply the award

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant because the same message `id` was already rewarded. Each successful grant SHALL add XP and enqueue another alert.

#### Scenario: Joke then advice
- **WHEN** the operator grants Joke and then Advice on the same message
- **THEN** XP increases by 10 then by 50 and two alerts are queued in order

### Requirement: Reward controls appear on lines with a stable identity
Admin Live messages and `/dock/messages` SHALL offer a Reward control when the line has a non-empty `platform` and `user_id`. The control SHALL open a short picker of award types (not one button per type on the row). Choosing a type SHALL call `POST /api/awards/grant`. Lines without `user_id` MUST NOT show Reward. The dock MUST NOT offer command or award catalog editing.

#### Scenario: Dock reward
- **WHEN** a Twitch message with `user_id` is shown in the dock and the operator picks Advice
- **THEN** the client posts grant with that platform, user id, and the Advice id

#### Scenario: No identity
- **WHEN** a displayed line has no `user_id`
- **THEN** Reward is not offered
