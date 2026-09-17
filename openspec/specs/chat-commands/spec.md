# Chat Commands

## Purpose

Lets the operator define chat commands that the server matches on ingested lines and turns into on-stream alerts, without awarding XP.

## Requirements

### Requirement: Operator can manage a command catalog
The system SHALL persist chat commands in local SQLite. Each command SHALL have a unique trigger slug, optional unique aliases, enabled flag, per-viewer cooldown seconds, and `action` of `alert` or `show_leaderboard`. Alert commands SHALL retain the current required splash template, sound, duration, optional media, volume, layout, image-fit, and image-size fields. Show-leaderboard commands SHALL require no splash presentation and SHALL use global leaderboard display duration. `GET /api/commands` and existing POST-action mutations SHALL expose and accept `action` and `aliases`; omitted action SHALL mean `alert` for backward compatibility; omitted aliases SHALL mean none. Empty media fields SHALL continue to clear alert assets. The operator MUST be able to delete any command.

#### Scenario: Existing alert command
- **WHEN** an existing command row is read after upgrade
- **THEN** its action is `alert`, its aliases list is empty, and its splash behavior is unchanged

#### Scenario: Create alert command
- **WHEN** the operator creates an alert command with trigger `lurk`
- **THEN** `GET /api/commands` includes its action, empty `aliases`, and current splash, media, sound, layout, image, and duration fields

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
- **WHEN** the operator creates another command using an existing trigger or alias
- **THEN** the request fails with HTTP 400 and a field error on `trigger` or `aliases` as appropriate regardless of action

### Requirement: Commands may declare unique aliases
Each command MAY persist zero or more additional trigger slugs (`aliases`) besides its canonical `trigger`. Every alias SHALL use the same slug rules as `trigger` (`[a-z0-9_]{1,32}`, no `!`, no whitespace). The system MUST reject a save when any alias equals that command's canonical trigger, duplicates another alias on the same command, or collides with any other command's trigger or alias, enabled or disabled. Omitted `aliases` on create or update SHALL mean an empty list. At most 16 aliases SHALL be stored per command.

#### Scenario: Alias saved
- **WHEN** the operator saves enabled command `heat` with aliases `["heate"]`
- **THEN** `GET /api/commands` includes `aliases` `["heate"]` for that command

#### Scenario: Duplicate alias rejected
- **WHEN** the operator saves an alias that equals another command's trigger or alias
- **THEN** the request fails with HTTP 400 and a field error on `aliases`

#### Scenario: Canonical as alias rejected
- **WHEN** the operator saves command `heat` with alias `heat`
- **THEN** the request fails with HTTP 400 and a field error on `aliases`

#### Scenario: Empty aliases default
- **WHEN** a command is created without `aliases`
- **THEN** `GET /api/commands` returns `aliases` as an empty array

#### Scenario: Upgrade has no aliases
- **WHEN** CommRelay migrates an existing catalog
- **THEN** every command has an empty alias list and exact trigger matching is unchanged until the operator saves aliases

#### Scenario: Pack YAML aliases
- **WHEN** a content pack command lists `aliases` in `pack.yaml`
- **THEN** apply stores those aliases on the imported command and rejects the pack when any alias violates uniqueness or slug rules

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
The matcher SHALL retain whole-line, trimmed, lowercase bang-command parsing. After parsing, it SHALL match an enabled command by exact canonical trigger, exact alias, or the unique one-edit typo rule. After enabled-command and per-viewer cooldown checks, an `alert` action SHALL enqueue its current splash, while `show_leaderboard` SHALL request leaderboard display with reason `command` and MUST NOT enqueue an alert. Unknown, disabled, parameterized, extra-word, or non-bang lines SHALL retain current ordinary-chat behavior.

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
- **WHEN** the viewer sends `!unknown` and no such trigger or unique typo exists
- **THEN** the line remains ordinary chat

#### Scenario: Disabled command
- **WHEN** the viewer sends an exact trigger for a disabled command
- **THEN** the line remains ordinary chat and no action fires

#### Scenario: Request during visibility cooldown
- **WHEN** a valid viewer command fires while automatic triggers are cooling down
- **THEN** the command request bypasses the visibility cooldown but consumes its own per-viewer command cooldown

### Requirement: Exact alias matches the canonical command
An enabled command SHALL match a whole-line bang token that equals its canonical trigger or any of its aliases (trimmed, lowercase). Cooldown, interaction events, alert `trigger`, and `command_outcome.trigger` MUST use the canonical trigger and command id. The chat line text MUST remain as typed. Disabled commands MUST NOT match their trigger or aliases, and an exact token that belongs only to a disabled command MUST remain ordinary chat (no typo fallback to another command).

#### Scenario: Alias fires canonical command
- **WHEN** enabled command `heat` has alias `heate` and a viewer sends `!heate` outside cooldown
- **THEN** the `heat` alert fires, the line is marked `is_command`, and `command_outcome.trigger` is `heat`

#### Scenario: Alias shares cooldown
- **WHEN** the same identity sends `!heat` and then `!heate` within the command cooldown
- **THEN** only the first fire produces an alert and the second publishes status `cooldown` for trigger `heat`

#### Scenario: Disabled alias stays ordinary
- **WHEN** disabled command `heat` has alias `heate` and a viewer sends `!heate`
- **THEN** the line remains ordinary chat and no command outcome is published

### Requirement: Unique one-edit typo may match a long canonical trigger
After exact trigger and alias lookup fails, the matcher MAY treat a whole-line bang token (no spaces) as a match when Damerau-Levenshtein distance to the candidate set is ≤ 1, the command is enabled, its canonical trigger is at least 4 characters, and exactly one command wins. The candidate set for a command SHALL be its canonical trigger plus its aliases. Seeded short triggers (`gg`, `hi`) MUST NOT win a typo match. If two distinct commands are at distance ≤ 1, or the typed token has extra words, the line MUST remain ordinary chat. Fuzzy matches MUST apply the same canonical cooldown, `is_command`, interaction event, and `command_outcome` rules as an exact match.

#### Scenario: Unique typo fires
- **WHEN** enabled command `heat` has no alias `heate`, no other enabled command is at distance 1, and a viewer sends `!heate`
- **THEN** command `heat` matches, `is_command` is true, and `command_outcome.trigger` is `heat`

#### Scenario: Short seed is not fuzzy
- **WHEN** a viewer sends `!go` and only enabled seed `gg` exists
- **THEN** the line remains ordinary chat

#### Scenario: Ambiguous neighbors stay ordinary
- **WHEN** enabled commands `heat` and `heal` both exist and a viewer sends a token at distance 1 from both
- **THEN** the line remains ordinary chat and no command outcome is published

#### Scenario: Extra words stay ordinary
- **WHEN** a viewer sends `!heat please`
- **THEN** the line remains ordinary chat even if `heat` is enabled

#### Scenario: Typo of alias of a long command
- **WHEN** enabled command `heat` has alias `heater` and a viewer sends `!heate` with no exact catalog name `heate`
- **THEN** command `heat` matches if it is the unique distance-1 winner

### Requirement: Per-viewer cooldown is configurable
Each command SHALL have a cooldown in seconds (≥ 0). After a successful fire for a viewer identity, further matches of that command by the same identity SHALL be ignored until the cooldown elapses. Cooldown 0 SHALL mean no cooldown. A suppressed match MUST NOT enqueue an alert, MUST NOT write an interaction event, and MUST NOT reply on the streaming platform. A suppressed match MUST still publish a `cooldown` outcome to clients.

#### Scenario: Within cooldown
- **WHEN** the same identity sends `!gg` twice within the command's cooldown
- **THEN** only the first fire produces an alert

#### Scenario: After cooldown
- **WHEN** the cooldown has elapsed and the identity sends `!gg` again
- **THEN** a second alert is enqueued

#### Scenario: Cooldown is observable
- **WHEN** the same identity sends `!gg` twice within the command's cooldown
- **THEN** the second match publishes status `cooldown` and remaining milliseconds greater than zero

### Requirement: Commands never change score
Firing a command MUST NOT increment or decrement `xp`. `message_count` SHALL still increment for a matched line that has a stable identity, same as ordinary chat. That counted line MAY still be eligible for a silent activity grant under viewer-stats rules.

#### Scenario: Gg from a known viewer
- **WHEN** a counted identity fires `!gg` after already receiving activity XP this interval
- **THEN** that viewer's `message_count` increases and `xp` is unchanged by the command fire itself

### Requirement: Overlay can hide command lines globally
`hide_command_messages` SHALL be a global operator setting (default false). The server SHALL mark matched command lines on the WebSocket `message` frame (field `is_command` true). When the setting is true, `/overlay` MUST NOT render **successful** command lines. Admin and dock MUST still show them. Changing the setting SHALL apply to new lines without requiring a process restart. Cooldown overlay rows SHALL follow `hide_command_cooldown_overlay` instead of this flag.

#### Scenario: Hide enabled
- **WHEN** `hide_command_messages` is true and a viewer sends `!gg` outside cooldown
- **THEN** admin and dock show the line and the chat overlay does not

#### Scenario: Hide disabled
- **WHEN** `hide_command_messages` is false and a viewer sends `!gg`
- **THEN** the chat overlay shows the line and the alert overlay still shows the splash

### Requirement: Matched commands publish a fired or cooldown outcome
After an enabled command matches a whole bang line with a stable identity, the server SHALL decide exactly one outcome: `fired` when cooldown allows the configured action, or `cooldown` when the same identity is still inside that command's cooldown. The server MUST publish that outcome to connected clients. A `fired` outcome SHALL still enqueue the alert or request leaderboard visibility as today. A `cooldown` outcome MUST NOT enqueue an alert, MUST NOT request leaderboard visibility, MUST NOT write an interaction event, and MUST NOT reply on a streaming platform. Unknown, disabled, parameterized, extra-word, or non-bang lines MUST remain ordinary chat and MUST NOT receive an outcome. Empty-identity skips MUST keep current diagnostics and MUST NOT produce viewer-facing overlay feedback.

#### Scenario: First bang fires
- **WHEN** a viewer with a stable identity sends `!gg` outside cooldown
- **THEN** the command fires its action and clients receive status `fired`

#### Scenario: Second bang is cooldown
- **WHEN** the same identity sends `!gg` again before the command cooldown elapses
- **THEN** no second alert or leaderboard request occurs and clients receive status `cooldown` with remaining cooldown time

#### Scenario: Leaderboard command is accepted
- **WHEN** an enabled `show_leaderboard` command fires
- **THEN** clients receive status `fired` even though no splash is enqueued

#### Scenario: Unknown bang stays ordinary
- **WHEN** a viewer sends `!unknown`
- **THEN** the line remains ordinary chat and no command outcome is published

### Requirement: Overlay cooldown visibility is independent of hiding successful commands
`hide_command_messages` SHALL continue to hide **successful** matched command lines from `/overlay` when true. A separate operator flag `hide_command_cooldown_overlay` SHALL control cooldown rows on `/overlay` (default false: show a short frozen cooldown row). When `hide_command_cooldown_overlay` is false, a cooldown row MUST appear on `/overlay` for a fixed short duration even if `hide_command_messages` is true. Admin and dock MUST always show matched command lines regardless of either flag.

#### Scenario: Hide successful commands, show cooldown
- **WHEN** `hide_command_messages` is true, `hide_command_cooldown_overlay` is false, and a viewer sends `!gg` during cooldown
- **THEN** `/overlay` shows a short frozen cooldown row and does not show a successful `!gg` line

#### Scenario: Hide overlay cooldown
- **WHEN** `hide_command_cooldown_overlay` is true and a viewer sends `!gg` during cooldown
- **THEN** `/overlay` does not show the cooldown row while admin and dock still show the frozen line
