## Purpose

Allow an operator-defined command to request the leaderboard without reserving a hard-coded trigger or producing an alert splash.

## MODIFIED Requirements

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
