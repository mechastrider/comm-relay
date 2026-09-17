## ADDED Requirements

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

## MODIFIED Requirements

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
