## ADDED Requirements

### Requirement: Social command actions may take a nick remainder
Commands with `action` `like` or `buff` SHALL match a leading bang trigger (canonical, alias, or unique typo) plus an optional remainder. The remainder is not extra words: it is the nick payload defined by `viewer-social-commands`. Commands with `action` `alert` or `show_leaderboard` MUST keep whole-line matching; extra words SHALL remain ordinary chat with no outcome.

#### Scenario: Buff with nick is a command
- **WHEN** enabled buff command trigger `buff` receives `!buff Alice`
- **THEN** the line is a matched command (`is_command` true) and is not ordinary chat

#### Scenario: Alert with extra words stays ordinary
- **WHEN** enabled alert command `gg` receives `!gg Alice`
- **THEN** the line remains ordinary chat and no command outcome is published

#### Scenario: Like typo still uses canonical trigger
- **WHEN** enabled like command trigger `like` has no alias `lik` and a unique distance-1 token `lik` is sent as `!lik bob`
- **THEN** `command_outcome.trigger` is `like` if the canonical trigger length is at least 4 and the unique-typo rule otherwise matches

## MODIFIED Requirements

### Requirement: Operator can manage a command catalog
The system SHALL persist chat commands in local SQLite. Each command SHALL have a unique trigger slug, optional unique aliases, enabled flag, per-viewer cooldown seconds, and `action` of `alert`, `show_leaderboard`, `like`, or `buff`. Alert commands SHALL retain the current required splash template, sound, duration, optional media, volume, layout, image-fit, and image-size fields. Show-leaderboard commands SHALL require no splash presentation and SHALL use global leaderboard display duration. Like commands SHALL require `award_id` of an existing award type. Buff commands SHALL require positive integer `points` and MUST NOT require splash presentation. `GET /api/commands` and existing POST-action mutations SHALL expose and accept `action` and `aliases`; omitted action SHALL mean `alert` for backward compatibility; omitted aliases SHALL mean none. Empty media fields SHALL continue to clear alert assets. The operator MUST be able to delete any command.

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

#### Scenario: Create buff command
- **WHEN** the operator creates trigger `buff` with action `buff` and `points` 5
- **THEN** `GET /api/commands` returns that action and points and `!buff` can match after save

#### Scenario: Create like command
- **WHEN** the operator creates trigger `like` with action `like` and `award_id` `viewer_like`
- **THEN** `GET /api/commands` returns that binding and `!like bob` can match after save

#### Scenario: Invalid like binding
- **WHEN** the operator saves action `like` without an existing `award_id`
- **THEN** the request fails with HTTP 400 and a field error on `award_id`

### Requirement: Commands never change score
Firing `alert` or `show_leaderboard` MUST NOT increment or decrement `xp`. Firing `like` or `buff` MUST NOT change the **giver's** `xp`. Recipient XP for those actions SHALL follow `viewer-social-commands` and `viewer-stats`. `message_count` SHALL still increment for a matched line that has a stable identity.

#### Scenario: Gg from a known viewer
- **WHEN** a counted identity fires `!gg` after already receiving activity XP this interval
- **THEN** that viewer's `message_count` increases and `xp` is unchanged by the command fire itself

#### Scenario: Like does not pay the giver
- **WHEN** Alice successfully likes Bob
- **THEN** Alice's XP is unchanged by that like
- **AND** Bob's XP increases by the bound award points

### Requirement: Matched commands publish a fired or cooldown outcome
After an enabled command matches with a stable identity, the server SHALL decide exactly one outcome: `fired`, `cooldown`, or `rejected` (social actions only, per `viewer-social-commands`). Unknown, disabled, extra-word (non-social), or non-bang lines MUST remain ordinary chat and MUST NOT receive an outcome. The server MUST NOT reply on a streaming platform.

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

#### Scenario: Social rejection is still an outcome
- **WHEN** a viewer with a stable identity sends `!like` with no nick
- **THEN** clients receive status `rejected` and the line is `is_command` true
