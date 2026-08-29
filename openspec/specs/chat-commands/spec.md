# Chat Commands

## Purpose

Lets the operator define chat commands that the server matches on ingested lines and turns into on-stream alerts, without awarding score.

## Requirements

### Requirement: Operator can manage a command catalog
The system SHALL persist chat commands in local SQLite (not `config.json`). Each command SHALL have a unique trigger slug, enabled flag, per-viewer cooldown seconds, splash text template, built-in sound id or silence, optional reserved media fields (`image_asset`, `sound_file`) that MAY be null, and splash duration. `GET /api/commands` SHALL list commands. Mutations SHALL be `POST /api/commands/create`, `POST /api/commands/update`, and `POST /api/commands/delete` with identifiers in the JSON body. The operator MUST be able to delete any command, including seeds.

#### Scenario: Create command
- **WHEN** the operator creates a command with trigger `lurk`
- **THEN** `GET /api/commands` includes that command and chat line `!lurk` can match it after save

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded `gg` command
- **THEN** `!gg` no longer matches and a process restart MUST NOT recreate it

#### Scenario: Duplicate trigger rejected
- **WHEN** the operator creates a second command with trigger `gg` while `gg` exists
- **THEN** the request fails with HTTP 400 and a field error on the trigger

### Requirement: First migrate seeds deletable gg and hi
On the migration that introduces the commands table, the system SHALL insert enabled commands `gg` and `hi` with cooldown 30 seconds, score delta unused (commands never award score), default splash templates using `{name}`, and a built-in tone. Seeds MUST NOT be re-inserted on later startups.

#### Scenario: Fresh database
- **WHEN** CommRelay starts against a database that just applied this migration
- **THEN** the catalog contains `gg` and `hi` and both are deletable

### Requirement: Server matches a whole bang command line
The matcher SHALL trim surrounding whitespace, lowercase the line, and treat it as a command only when it starts with `!`. For this change the remainder after `!` MUST equal a command trigger exactly (no parameters, no extra words). Matching SHALL run on the server. Disabled commands MUST NOT match. Lines that are not commands SHALL pass through as ordinary chat.

#### Scenario: Bang gg
- **WHEN** a viewer sends `  !GG  ` and command `gg` is enabled
- **THEN** the server treats it as command `gg` and enqueues an alert

#### Scenario: Missing bang
- **WHEN** a viewer sends `gg`
- **THEN** the line is ordinary chat and MUST NOT fire the command

#### Scenario: Extra words
- **WHEN** a viewer sends `!gg please`
- **THEN** the line is ordinary chat and MUST NOT fire the command

#### Scenario: Unknown bang
- **WHEN** a viewer sends `!foo` and no command `foo` exists
- **THEN** the line is ordinary chat

### Requirement: Per-viewer cooldown is configurable
Each command SHALL have a cooldown in seconds (≥ 0). After a successful fire for a viewer identity, further matches of that command by the same identity SHALL be ignored until the cooldown elapses. Cooldown 0 SHALL mean no cooldown. A suppressed match MUST NOT enqueue an alert, MUST NOT write an interaction event, and MUST NOT reply on the streaming platform.

#### Scenario: Within cooldown
- **WHEN** the same identity sends `!gg` twice within the command's cooldown
- **THEN** only the first fire produces an alert

#### Scenario: After cooldown
- **WHEN** the cooldown has elapsed and the identity sends `!gg` again
- **THEN** a second alert is enqueued

### Requirement: Commands never change score
Firing a command MUST NOT increment or decrement `score`. `message_count` SHALL still increment for a matched line that has a stable identity, same as ordinary chat.

#### Scenario: Gg from a known viewer
- **WHEN** a counted identity fires `!gg`
- **THEN** that viewer's `message_count` increases and `score` is unchanged by the command

### Requirement: Overlay can hide command lines globally
`hide_command_messages` SHALL be a global operator setting (default false). The server SHALL mark matched command lines on the WebSocket `message` frame (field `is_command` true). When the setting is true, `/overlay` MUST NOT render those lines. Admin and dock MUST still show them. Changing the setting SHALL apply to new lines without requiring a process restart.

#### Scenario: Hide enabled
- **WHEN** `hide_command_messages` is true and a viewer sends `!gg`
- **THEN** admin and dock show the line and the chat overlay does not

#### Scenario: Hide disabled
- **WHEN** `hide_command_messages` is false and a viewer sends `!gg`
- **THEN** the chat overlay shows the line and the alert overlay still shows the splash
