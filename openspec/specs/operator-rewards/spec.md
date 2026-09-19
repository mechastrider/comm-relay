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

### Requirement: Locale-aware viewer-like starter award
On first social-catalog initialization of a database that does not already contain award id `viewer_like`, the system SHALL insert a deletable starter award `viewer_like` with 5 points, the `soft` sound, and 5000 millisecond duration. Display names and splash templates SHALL match the initialization locale: `Лайк зрителя` / `Лайк зрителя для {viewer}! +{points}` for `ru-RU` and `Viewer Like` / `Viewer Like for {viewer}! +{points}` for `en-GB`. Existing databases that already contain `viewer_like` MUST be adopted without renaming or changing points. After initialization, the row is ordinary user-owned data.

#### Scenario: Fresh Russian database
- **WHEN** social-catalog initialization runs while `admin.time_locale` is `ru-RU` and `viewer_like` is absent
- **THEN** award `viewer_like` exists, is named `Лайк зрителя`, grants 5 points, and is deletable

#### Scenario: Existing viewer_like kept
- **WHEN** an upgraded database already has award id `viewer_like`
- **THEN** its name and points are unchanged

### Requirement: Operator can grant an award from a chat line
`POST /api/awards/grant` SHALL accept `platform`, `user_id`, and `award_id`, plus optional `message_id` and `message_text` from the selected row. The system SHALL resolve the canonical viewer, add the award `points` to all-time, current-session, and current-day `xp`, append one interaction event, and broadcast one award alert. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award. The server MUST trim `message_text` and limit the transient quote to 280 Unicode code points before broadcast. It MUST NOT persist the quote. Missing source-message fields MUST NOT prevent a valid award grant. Successful viewer `like` commands SHALL reuse the same grant effects for the recipient without calling that HTTP route from the overlay. Buff MUST NOT create an operator grant row for the original award id.

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

#### Scenario: Viewer like is not an operator picker grant
- **WHEN** Alice likes Bob via `!like bob`
- **THEN** Reward pickers and `POST /api/awards/grant` are not required
- **AND** Bob still receives one award alert for `viewer_like` when that id is bound

### Requirement: Same award type cannot be granted twice on one source message
When `POST /api/awards/grant` includes a non-empty `message_id`, the system SHALL treat `(platform, message_id, award_id)` as already granted if a durable award event with those values exists. A repeat MUST fail with HTTP 409, MUST NOT add XP, MUST NOT append another award event, and MUST NOT broadcast an award alert. A grant of a different `award_id` on the same source message SHALL still succeed. A grant that omits `message_id` MUST NOT use this uniqueness rule. Viewer `like` grants that reuse the same grant effects SHALL follow the same uniqueness rule when they record a source message id.

#### Scenario: Repeat Streamer Like
- **WHEN** the operator grants `like` from a row with a stable message id and then grants `like` again for that same platform and message id
- **THEN** the second request returns HTTP 409 and XP, history, and alerts are unchanged

#### Scenario: Joke then Advice
- **WHEN** the operator grants Joke and then Advice on the same source message
- **THEN** both grants succeed and two alerts are queued in order

#### Scenario: No message id
- **WHEN** the operator grants an award with a stable viewer identity but no `message_id`
- **THEN** the grant succeeds even if that viewer already received the same award type on another line

#### Scenario: Two clients
- **WHEN** Live and the dock both grant the same `award_id` for the same source message
- **THEN** exactly one grant commits and the other receives HTTP 409

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant solely because the same message `id` was already rewarded with a *different* award type. Each successful grant SHALL add XP and enqueue another alert. A second grant of the *same* `award_id` on that message SHALL follow the uniqueness requirement above.

#### Scenario: Joke then advice
- **WHEN** the operator grants the fresh-catalog Joke and then Advice on the same message
- **THEN** XP increases by 10 then by 25 and two alerts are queued in order

#### Scenario: Same type blocked
- **WHEN** the operator grants Joke twice on the same message id
- **THEN** the second grant is rejected without a second Joke alert

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

### Requirement: Contract settlement grants a catalog reward snapshot
A successful viewer-contract award SHALL apply its snapshotted catalog reward as one normal operator award: positive XP SHALL be added once, the captured reward id and name SHALL identify the award event, and the captured presentation SHALL drive the award alert. It MUST NOT require the live catalog row still to exist and MUST NOT add a second reward or currency system.

#### Scenario: Deleted catalog item is awarded
- **WHEN** an active contract's source reward was deleted after announcement and the operator selects a winner
- **THEN** settlement grants the snapshotted points once and emits a normal award alert using the captured presentation

#### Scenario: Contract award reaches existing consumers
- **WHEN** winner settlement commits
- **THEN** XP, leaderboard publication, interaction events, and alert behavior match a manual grant of the promised reward
