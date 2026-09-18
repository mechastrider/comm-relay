## MODIFIED Requirements

### Requirement: Command outcomes use a dedicated WebSocket envelope
The production `/ws` feed SHALL broadcast JSON with `type` `command_outcome`, `message_platform`, `message_id`, `trigger`, `status` (`fired`, `cooldown`, or `rejected`), and integer `cooldown_remaining_ms` (≥ 0). When `status` is `rejected`, the frame SHALL include `reason` as one of `missing_arg`, `not_found`, `ambiguous`, `self`, `no_award`, `quota`, `already_buffed`, or `award_full`, and MAY include locale-safe `reason_label` (`уточни` / `clarify` for `ambiguous`; short labels for other reasons). `trigger` MUST be the canonical catalog trigger of the matched command when the chat line used an alias or unique one-edit typo. `message_platform` and `message_id` SHALL identify the matched chat line using the same platform plus source id as `message` / `message_deleted`. Frames for cooldown MUST include remaining milliseconds until that identity may fire the same command again. Frames for `fired` MAY set `cooldown_remaining_ms` to the command's configured cooldown in milliseconds (0 when the command has no cooldown). Rejected frames SHALL set `cooldown_remaining_ms` to 0 unless a cooldown also applies. The `message` frame for that line SHALL set `is_command` true on exact trigger, exact alias, unique typo match, or a matched social command including rejections, and MUST remain ordinary (`is_command` absent or false) when the **command-trigger** typo is ambiguous. Clients that ignore the type MUST continue processing `message`, `alert`, and other existing frames. The server MUST NOT consume command cooldown when tagging `is_command` on the `message` frame.

#### Scenario: Fired outcome
- **WHEN** `!gg` fires for a Twitch line with source id `abc`
- **THEN** clients receive `type` `command_outcome` with `status` `fired`, `trigger` `gg`, `message_platform` `twitch`, and `message_id` `abc`

#### Scenario: Alias outcome is canonical
- **WHEN** a viewer sends `!heate` and it matches command `heat`
- **THEN** the `message` frame has `is_command` true, `command_outcome.trigger` is `heat`, and `message_id` identifies the `!heate` line

#### Scenario: Unique typo is marked
- **WHEN** enabled command `heat` is the unique distance-1 winner for `!heate`
- **THEN** the `message` frame has `is_command` true and `command_outcome.trigger` is `heat`

#### Scenario: Ambiguous typo is not marked
- **WHEN** two enabled commands are at distance 1 from the typed token
- **THEN** the `message` frame omits `is_command` or sets it false and no `command_outcome` is published

#### Scenario: Cooldown outcome
- **WHEN** the same identity sends `!gg` again during cooldown
- **THEN** clients receive `status` `cooldown` and `cooldown_remaining_ms` greater than zero, and MUST NOT receive a second command `alert`

#### Scenario: Unrelated client
- **WHEN** a leaderboard-only client receives `command_outcome`
- **THEN** it does not treat the frame as a ranking snapshot or chat row

#### Scenario: Rejected like without nick
- **WHEN** Alice sends `!like` with no remainder
- **THEN** clients receive `status` `rejected`, `reason` `missing_arg`, `trigger` `like`, and `is_command` true on the message

#### Scenario: Ambiguous nick is still a command
- **WHEN** Alice sends `!like alicx` and two session viewers sit at distance 1
- **THEN** clients receive `status` `rejected` and `reason` `ambiguous`
- **AND** the message frame has `is_command` true
