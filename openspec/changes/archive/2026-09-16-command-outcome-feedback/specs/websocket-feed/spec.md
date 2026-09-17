## ADDED Requirements

### Requirement: Command outcomes use a dedicated WebSocket envelope
The production `/ws` feed SHALL broadcast JSON with `type` `command_outcome`, `message_platform`, `message_id`, `trigger`, `status` (`fired` or `cooldown`), and integer `cooldown_remaining_ms` (≥ 0). `message_platform` and `message_id` SHALL identify the matched chat line using the same platform plus source id as `message` / `message_deleted`. Frames for cooldown MUST include remaining milliseconds until that identity may fire the same command again. Frames for `fired` MAY set `cooldown_remaining_ms` to the command's configured cooldown in milliseconds (0 when the command has no cooldown). Clients that ignore the type MUST continue processing `message`, `alert`, and other existing frames. The server MUST NOT consume command cooldown when tagging `is_command` on the `message` frame.

#### Scenario: Fired outcome
- **WHEN** `!gg` fires for a Twitch line with source id `abc`
- **THEN** clients receive `type` `command_outcome` with `status` `fired`, `trigger` `gg`, `message_platform` `twitch`, and `message_id` `abc`

#### Scenario: Cooldown outcome
- **WHEN** the same identity sends `!gg` again during cooldown
- **THEN** clients receive `status` `cooldown` and `cooldown_remaining_ms` greater than zero, and MUST NOT receive a second command `alert`

#### Scenario: Unrelated client
- **WHEN** a leaderboard-only client receives `command_outcome`
- **THEN** it does not treat the frame as a ranking snapshot or chat row

## MODIFIED Requirements

### Requirement: Config broadcasts include hide_command_messages
After a successful config update that changes `hide_command_messages` or `hide_command_cooldown_overlay`, the hub SHALL include both flags in the public config or overlay settings payload used by overlay clients so they can hide or show new command and cooldown rows without reload.

#### Scenario: Operator enables hide
- **WHEN** the operator saves `hide_command_messages` true
- **THEN** connected overlay clients receive the updated flag

#### Scenario: Operator hides overlay cooldown
- **WHEN** the operator saves `hide_command_cooldown_overlay` true
- **THEN** connected overlay clients receive the updated cooldown-visibility flag
