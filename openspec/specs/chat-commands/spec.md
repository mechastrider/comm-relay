# Chat Commands

## Purpose

Lets the operator define chat commands that the server matches on ingested lines and turns into on-stream alerts, without awarding XP.

## Requirements

### Requirement: Operator can manage a command catalog
The system SHALL persist chat commands in local SQLite. Each command SHALL have a unique trigger slug, enabled flag, per-viewer cooldown seconds, and `action` of `alert` or `show_leaderboard`. Alert commands SHALL retain the current required splash template, sound, duration, optional media, volume, layout, image-fit, and image-size fields. Show-leaderboard commands SHALL require no splash presentation and SHALL use global leaderboard display duration. `GET /api/commands` and existing POST-action mutations SHALL expose and accept `action`; omitted action SHALL mean `alert` for backward compatibility. Empty media fields SHALL continue to clear alert assets. The operator MUST be able to delete any command.

#### Scenario: Existing alert command
- **WHEN** an existing command row is read after upgrade
- **THEN** its action is `alert` and its splash behavior is unchanged

#### Scenario: Create alert command
- **WHEN** the operator creates an alert command with trigger `lurk`
- **THEN** `GET /api/commands` includes its action and current splash, media, sound, layout, image, and duration fields

#### Scenario: Create command
- **WHEN** the operator creates an alert command with trigger `lurk`
- **THEN** `GET /api/commands` includes it and chat line `!lurk` can match it after save

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded `gg` command
- **THEN** `!gg` no longer matches and a process restart MUST NOT recreate it

#### Scenario: Save custom image
- **WHEN** the operator updates an alert command with a stored `image_asset` filename
- **THEN** `GET /api/commands` returns that filename and a later match uses it

#### Scenario: Create leaderboard action
- **WHEN** the operator creates trigger `leaderboard` with action `show_leaderboard`
- **THEN** `GET /api/commands` returns that action and does not require splash presentation fields

#### Scenario: Duplicate trigger rejected
- **WHEN** the operator creates another command using an existing trigger
- **THEN** the request fails with HTTP 400 and a field error on trigger regardless of action

### Requirement: Command media filenames are stored assets only
`image_asset` and `sound_file` SHALL be empty or a generated overlay-asset filename already stored beside `config.json`. The system MUST reject absolute paths, `..`, URLs, and names that fail the existing overlay asset name check.

#### Scenario: Path rejected
- **WHEN** create or update sets `image_asset` to `C:\\photos\\gg.png`
- **THEN** the request fails with HTTP 400 and a field error on `image_asset`

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

### Requirement: Server matches a whole bang command line
The matcher SHALL retain whole-line, trimmed, lowercase bang-command parsing and exact trigger lookup. After enabled-command and per-viewer cooldown checks, an `alert` action SHALL enqueue its current splash, while `show_leaderboard` SHALL request leaderboard display with reason `command` and MUST NOT enqueue an alert. Unknown, disabled, parameterized, or non-bang lines SHALL retain current ordinary-chat behavior.

#### Scenario: Viewer requests leaderboard
- **WHEN** enabled `show_leaderboard` trigger `leaderboard` matches `  !LEADERBOARD  ` outside cooldown
- **THEN** visibility is requested once and no alert frame is emitted

#### Scenario: Bang gg
- **WHEN** a viewer sends `  !GG  ` and alert command `gg` is enabled
- **THEN** the server treats it as command `gg` and enqueues its alert

#### Scenario: Missing bang
- **WHEN** a viewer sends `leaderboard`
- **THEN** the line remains ordinary chat and no command action fires

#### Scenario: Extra words
- **WHEN** the viewer sends `!leaderboard please`
- **THEN** the line remains ordinary chat and no leaderboard request occurs

#### Scenario: Unknown bang
- **WHEN** the viewer sends `!unknown` and no such trigger exists
- **THEN** the line remains ordinary chat

#### Scenario: Disabled command
- **WHEN** the viewer sends an exact trigger for a disabled command
- **THEN** the line remains ordinary chat and no action fires

#### Scenario: Request during visibility cooldown
- **WHEN** a valid viewer command fires while automatic triggers are cooling down
- **THEN** the command request bypasses the visibility cooldown but consumes its own per-viewer command cooldown

### Requirement: Per-viewer cooldown is configurable
Each command SHALL have a cooldown in seconds (≥ 0). After a successful fire for a viewer identity, further matches of that command by the same identity SHALL be ignored until the cooldown elapses. Cooldown 0 SHALL mean no cooldown. A suppressed match MUST NOT enqueue an alert, MUST NOT write an interaction event, and MUST NOT reply on the streaming platform.

#### Scenario: Within cooldown
- **WHEN** the same identity sends `!gg` twice within the command's cooldown
- **THEN** only the first fire produces an alert

#### Scenario: After cooldown
- **WHEN** the cooldown has elapsed and the identity sends `!gg` again
- **THEN** a second alert is enqueued

### Requirement: Commands never change score
Firing a command MUST NOT increment or decrement `xp`. `message_count` SHALL still increment for a matched line that has a stable identity, same as ordinary chat. That counted line MAY still be eligible for a silent activity grant under viewer-stats rules.

#### Scenario: Gg from a known viewer
- **WHEN** a counted identity fires `!gg` after already receiving activity XP this interval
- **THEN** that viewer's `message_count` increases and `xp` is unchanged by the command fire itself

### Requirement: Overlay can hide command lines globally
`hide_command_messages` SHALL be a global operator setting (default false). The server SHALL mark matched command lines on the WebSocket `message` frame (field `is_command` true). When the setting is true, `/overlay` MUST NOT render those lines. Admin and dock MUST still show them. Changing the setting SHALL apply to new lines without requiring a process restart.

#### Scenario: Hide enabled
- **WHEN** `hide_command_messages` is true and a viewer sends `!gg`
- **THEN** admin and dock show the line and the chat overlay does not

#### Scenario: Hide disabled
- **WHEN** `hide_command_messages` is false and a viewer sends `!gg`
- **THEN** the chat overlay shows the line and the alert overlay still shows the splash
