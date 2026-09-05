## Purpose

Keep chat commands as overlay entertainment that never changes contribution XP.

## MODIFIED Requirements

### Requirement: First migrate seeds deletable gg and hi
On the migration that introduces the commands table, the system SHALL insert enabled commands `gg` and `hi` with cooldown 30 seconds, XP delta unused (commands never award XP), default splash templates using `{name}`, and a built-in tone. Seeds MUST NOT be re-inserted on later startups.

#### Scenario: Fresh database
- **WHEN** CommRelay starts against a database that just applied this migration
- **THEN** the catalog contains `gg` and `hi` and both are deletable

### Requirement: Commands never change score
Firing a command MUST NOT increment or decrement `xp`. `message_count` SHALL still increment for a matched line that has a stable identity, same as ordinary chat. That counted line MAY still be eligible for a silent activity grant under viewer-stats rules.

#### Scenario: Gg from a known viewer
- **WHEN** a counted identity fires `!gg` after already receiving activity XP this interval
- **THEN** that viewer's `message_count` increases and `xp` is unchanged by the command fire itself
