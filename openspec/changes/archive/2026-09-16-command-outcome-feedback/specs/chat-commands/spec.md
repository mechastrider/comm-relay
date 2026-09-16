## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Overlay can hide command lines globally
`hide_command_messages` SHALL be a global operator setting (default false). The server SHALL mark matched command lines on the WebSocket `message` frame (field `is_command` true). When the setting is true, `/overlay` MUST NOT render **successful** command lines. Admin and dock MUST still show them. Changing the setting SHALL apply to new lines without requiring a process restart. Cooldown overlay rows SHALL follow `hide_command_cooldown_overlay` instead of this flag.

#### Scenario: Hide enabled
- **WHEN** `hide_command_messages` is true and a viewer sends `!gg` outside cooldown
- **THEN** admin and dock show the line and the chat overlay does not

#### Scenario: Hide disabled
- **WHEN** `hide_command_messages` is false and a viewer sends `!gg`
- **THEN** the chat overlay shows the line and the alert overlay still shows the splash
