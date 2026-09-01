## ADDED Requirements

### Requirement: Alert events use a stable wire envelope
When a command fires or an award is granted, the hub SHALL broadcast JSON with `type` `"alert"`, resolved splash `text`, `name`, optional `avatar_url`, `points`, `sound`, `duration_ms`, and optional `source` (`command` or `award`) plus the command trigger or `award_id`. Chat overlay, leaderboard, admin, and dock clients SHALL ignore unknown types, including `alert`.

#### Scenario: Command fire
- **WHEN** `!gg` matches
- **THEN** `/ws` clients receive `type` `alert` with `source` `command` and trigger `gg`

#### Scenario: Chat overlay ignores alerts
- **WHEN** an `alert` frame arrives at `/overlay`
- **THEN** the chat queue is unchanged except for the separate `message` frame of the chat line

### Requirement: Config broadcasts include hide_command_messages
After a successful config update that changes `hide_command_messages`, the hub SHALL include that flag in the public config or overlay settings payload used by overlay clients so they can hide or show new command lines without reload.

#### Scenario: Operator enables hide
- **WHEN** the operator saves `hide_command_messages` true
- **THEN** connected overlay clients receive the updated flag
