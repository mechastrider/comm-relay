# Interaction Events

## Purpose

Records command fires, operator awards, and silent activity XP grants as append-only events so later achievements can be computed retrospectively.

## Requirements

### Requirement: Successful command fires are logged
When a command matches and is not suppressed by cooldown, the system SHALL append an event with kind `command`, the command trigger, canonical `viewer_id` when known, `points` 0, and a timestamp. Cooldown-suppressed matches MUST NOT be logged.

#### Scenario: Gg fires
- **WHEN** identity `twitch`/`42` successfully fires `gg`
- **THEN** an interaction event exists with kind `command`, trigger `gg`, and that viewer

#### Scenario: Cooldown skip
- **WHEN** `!gg` is ignored because of cooldown
- **THEN** no new interaction event is appended

### Requirement: Successful awards are logged
When `POST /api/awards/grant` succeeds, the system SHALL append an event with kind `award`, the award id, `points`, canonical `viewer_id`, optional source message `platform` and `id` when provided, and a timestamp.

#### Scenario: Advice grant
- **WHEN** the operator grants Advice to a viewer
- **THEN** an interaction event exists with kind `award`, that award id, and `points` 50

### Requirement: Events are durable and not a chat archive
Interaction events SHALL remain durable in SQLite and MAY store a source message `platform` and stable `id`. They MUST NOT persist `message_text`, a rendered quote, fragments, or other full chat content. The system MUST NOT add an interaction-log browsing API or UI in this change.

#### Scenario: Message-aware award survives restart
- **WHEN** an award grant includes a message id and transient quote and the process restarts
- **THEN** the durable event retains the message platform and id but no quote text

#### Scenario: Restart
- **WHEN** the process restarts after a grant
- **THEN** the award event is still present in the database without persisted full chat text

#### Scenario: Grant without message reference
- **WHEN** a valid award is granted without a stable message id
- **THEN** the durable award event is still appended with null source-message fields

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
