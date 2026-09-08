## MODIFIED Requirements

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
