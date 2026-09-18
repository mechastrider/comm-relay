## ADDED Requirements

### Requirement: Successful buffs are logged as buff events
When a buff fires, the system SHALL append one event with kind `buff`, the giver as `viewer_id`, the recipient viewer id, the buff `points`, the targeted operator award event id, the open `session_id`, and a timestamp. The event MUST NOT store chat text or a second original `award_id` grant. If the event cannot be persisted, the buff MUST fail without committing XP.

#### Scenario: Buff is durable
- **WHEN** Alice successfully buffs Bob's Spotter by 5
- **THEN** one `buff` interaction event exists with Alice as viewer, Bob as recipient, points 5, and that Spotter event id

#### Scenario: Buff persistence fails
- **WHEN** the buff event cannot be persisted
- **THEN** no XP change and no `fired` outcome is committed

### Requirement: Viewer likes are award events on the recipient
A successful like SHALL append the same kind `award` event as an operator grant, with the recipient as `viewer_id`, the bound award id and name snapshot, points, open `session_id`, and timestamp. It MAY record the giver viewer id as additional attribution without changing reward-history fields. Chat text MUST NOT be stored. A successful like MUST also append the giver's kind `command` event as today for successful command fires.

#### Scenario: Like records both facts
- **WHEN** Alice successfully likes Bob with `viewer_like` for 5 points
- **THEN** one award event exists for Bob with award id `viewer_like` and points 5
- **AND** one command event exists for Alice with the like command id

## MODIFIED Requirements

### Requirement: Successful command fires are logged
When an `alert`, `show_leaderboard`, `like`, or `buff` action matches and is not suppressed by its per-viewer cooldown and is not socially rejected, the system SHALL append an event with kind `command`, the command trigger, canonical `viewer_id` when known, `points` 0, and a timestamp. The event MAY include the command action but MUST NOT store chat text. Cooldown-suppressed matches and rejected social matches MUST NOT be logged.

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

#### Scenario: Rejected like is not a command event
- **WHEN** Alice sends `!like` with no nick
- **THEN** no new command interaction event is appended
