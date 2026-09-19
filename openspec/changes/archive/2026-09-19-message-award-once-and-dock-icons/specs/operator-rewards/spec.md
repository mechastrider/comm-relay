## ADDED Requirements

### Requirement: Same award type cannot be granted twice on one source message
When `POST /api/awards/grant` includes a non-empty `message_id`, the system SHALL treat `(platform, message_id, award_id)` as already granted if a durable award event with those values exists. A repeat MUST fail with HTTP 409, MUST NOT add XP, MUST NOT append another award event, and MUST NOT broadcast an award alert. A grant of a different `award_id` on the same source message SHALL still succeed. A grant that omits `message_id` MUST NOT use this uniqueness rule. Viewer `like` grants that reuse the same grant effects SHALL follow the same uniqueness rule when they record a source message id.

#### Scenario: Repeat Streamer Like
- **WHEN** the operator grants `like` from a row with a stable message id and then grants `like` again for that same platform and message id
- **THEN** the second request returns HTTP 409 and XP, history, and alerts are unchanged

#### Scenario: Joke then Advice
- **WHEN** the operator grants Joke and then Advice on the same source message
- **THEN** both grants succeed and two alerts are queued in order

#### Scenario: No message id
- **WHEN** the operator grants an award with a stable viewer identity but no `message_id`
- **THEN** the grant succeeds even if that viewer already received the same award type on another line

#### Scenario: Two clients
- **WHEN** Live and the dock both grant the same `award_id` for the same source message
- **THEN** exactly one grant commits and the other receives HTTP 409

## MODIFIED Requirements

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant solely because the same message `id` was already rewarded with a *different* award type. Each successful grant SHALL add XP and enqueue another alert. A second grant of the *same* `award_id` on that message SHALL follow the uniqueness requirement above.

#### Scenario: Joke then advice
- **WHEN** the operator grants the fresh-catalog Joke and then Advice on the same message
- **THEN** XP increases by 10 then by 25 and two alerts are queued in order

#### Scenario: Same type blocked
- **WHEN** the operator grants Joke twice on the same message id
- **THEN** the second grant is rejected without a second Joke alert
