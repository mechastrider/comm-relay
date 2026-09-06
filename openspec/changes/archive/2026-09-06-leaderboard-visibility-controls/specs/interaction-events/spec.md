## Purpose

Keep command analytics consistent when commands perform a non-alert action.

## MODIFIED Requirements

### Requirement: Successful command fires are logged
When any command action matches and is not suppressed by its per-viewer cooldown, the system SHALL append an event with kind `command`, the command trigger, canonical `viewer_id` when known, `points` 0, and a timestamp. The event MAY include the command action but MUST NOT store chat text. Cooldown-suppressed matches MUST NOT be logged.

#### Scenario: Alert command fires
- **WHEN** identity `twitch`/`42` successfully fires alert command `gg`
- **THEN** one command interaction event exists with trigger `gg` and that viewer

#### Scenario: Gg fires
- **WHEN** identity `twitch`/`42` successfully fires `gg`
- **THEN** an interaction event exists with kind `command`, trigger `gg`, and that viewer

#### Scenario: Leaderboard command fires
- **WHEN** that identity successfully fires a show-leaderboard command
- **THEN** one command interaction event is appended even though no alert is emitted

#### Scenario: Cooldown skip
- **WHEN** either command action is ignored because of per-viewer cooldown
- **THEN** no new interaction event is appended
