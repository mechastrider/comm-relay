# Interaction Events

## Purpose

Records command fires, operator awards, and silent activity XP grants as append-only events so later achievements can be computed retrospectively.

## Requirements

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

### Requirement: Successful awards are logged
When `POST /api/awards/grant` succeeds, the system SHALL atomically apply the award points and append one event with kind `award`, the award id, the award display name captured at grant time, `points`, canonical `viewer_id`, optional source message `platform` and `id` when provided, and a timestamp. If the event cannot be persisted, the request MUST fail without committing XP or broadcasting the award alert.

#### Scenario: Advice grant
- **WHEN** the operator grants Advice to a viewer
- **THEN** one interaction event exists with kind `award`, that award id, the captured name `Advice`, and `points` 25

#### Scenario: Event persistence fails
- **WHEN** the award event cannot be persisted during a grant
- **THEN** the grant fails without changing XP or broadcasting an award alert

### Requirement: Events are durable and not a chat archive
Interaction events SHALL remain durable in SQLite and MAY store a source message `platform` and stable `id`. Award events SHALL store a non-empty award-name snapshot suitable for the reward-history read model. Events MUST NOT persist `message_text`, a rendered quote, fragments, or other full chat content. A bounded read model MAY expose award events but MUST NOT expose stored source-message identifiers or non-award events as reward history.

#### Scenario: Message-aware award survives restart
- **WHEN** an award grant includes a message id and transient quote and the process restarts
- **THEN** the durable event retains the message platform and id and the award-name snapshot but no quote text

#### Scenario: Restart
- **WHEN** the process restarts after a grant
- **THEN** the award event is still present in the database without persisted full chat text

#### Scenario: Grant without message reference
- **WHEN** a valid award is granted without a stable message id
- **THEN** the durable award event is still appended with null source-message fields and a non-empty award-name snapshot

### Requirement: Successful activity grants are logged
When an activity grant succeeds, the system SHALL append an event with kind `activity`, `points` equal to `activity_xp`, canonical `viewer_id` when known, and a timestamp. The event MUST NOT include chat text. Activity grants that are skipped because of interval, session limit, or disabled settings MUST NOT be logged.

#### Scenario: First activity grant
- **WHEN** a known identity receives their first activity XP of the session
- **THEN** an interaction event exists with kind `activity` and `points` equal to the configured `activity_xp`

#### Scenario: Interval skip
- **WHEN** a counted line is ignored for activity because the interval has not elapsed
- **THEN** no new `activity` interaction event is appended

### Requirement: Merge does not delete historical events
When two viewers are merged, existing events SHALL keep their original `viewer_id` or SHALL be rewritten to the surviving viewer. Either behavior MUST be documented in design; silent deletion of events is forbidden.

#### Scenario: Merge after awards
- **WHEN** viewer A has award events and is merged into viewer B
- **THEN** those events remain queryable for achievement work and are not dropped

### Requirement: Contract awards are durable award events
Successful winner settlement SHALL append exactly one interaction event with kind `award`, the snapshotted reward id, reward-name snapshot, points, canonical `viewer_id`, timestamp, and the settling `contract_id`. It MUST NOT persist contract objective text or chat content. Closing without a result MUST NOT append an interaction event.

#### Scenario: Contract winner is recorded
- **WHEN** a viewer wins a 25 XP contract
- **THEN** one `award` interaction event records 25 points, that viewer, the reward snapshot, and the contract id

#### Scenario: Contract closes without result
- **WHEN** a contract closes without a winner
- **THEN** no command, activity, or award interaction event is added

### Requirement: Live interaction events carry authoritative session attribution
Every successfully persisted live command, award, activity grant, and contract award interaction event SHALL store the open `session_id` in the same transaction as its existing fact. Session attribution MUST NOT change event kind, XP, source-message references, or the prohibition on stored chat text. Historical interaction rows MAY remain unattributed only when their timestamp cannot be mapped unambiguously to one session.

#### Scenario: Award during current session
- **WHEN** an operator award commits in the open session
- **THEN** its interaction event references that session atomically with the XP grant

#### Scenario: Ambiguous legacy event
- **WHEN** an upgrade cannot map an existing event timestamp to exactly one historical session interval
- **THEN** the event remains durable with no `session_id` and no session is guessed

### Requirement: Viewer merges preserve session attribution
Merging viewers SHALL keep each interaction event's existing session attribution while reassigning its viewer according to current merge rules. It MUST NOT move an event to the merge-time session.

#### Scenario: Merge after several streams
- **WHEN** a source viewer has attributed events in two historical sessions and is merged
- **THEN** both events remain linked to their original sessions under the surviving viewer
