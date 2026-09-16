## ADDED Requirements

### Requirement: Recent messages include in-memory command outcomes
`GET` recent-message responses SHALL include optional `command_outcome` on a message when the process still holds an outcome for that platform plus source id. The object SHALL use `trigger`, `status` (`fired` or `cooldown`), and integer `cooldown_remaining_ms` matching the live `command_outcome` frame at read time. Messages without a stored outcome MUST omit the field. A process restart MUST NOT reconstruct outcomes from SQLite.

#### Scenario: Recent cooldown line
- **WHEN** admin or dock loads recent messages during an active cooldown
- **THEN** the matching command message includes `command_outcome.status` `cooldown` and remaining milliseconds greater than zero

#### Scenario: Ordinary chat omitted
- **WHEN** a recent line was never a matched command
- **THEN** the message object has no `command_outcome` field
