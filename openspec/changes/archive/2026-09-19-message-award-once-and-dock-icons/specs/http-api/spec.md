## ADDED Requirements

### Requirement: Grant conflict is HTTP 409
`POST /api/awards/grant` SHALL return HTTP 409 with a UI-safe JSON error when the same `award_id` was already granted for the request's `platform` and non-empty `message_id`. The response MUST NOT leak internals. Successful grants and existing 400/500 mappings remain unchanged.

#### Scenario: Duplicate like
- **WHEN** the client posts a second grant with the same `platform`, `message_id`, and `award_id` `like`
- **THEN** the response is HTTP 409 and no new award JSON success body is returned

### Requirement: Recent messages include granted award ids
`GET /api/messages/recent` SHALL include `granted_award_ids` on a message when at least one durable award event records that message's `platform` and source `id`. The field SHALL be a JSON array of award ids, unique, in grant order from oldest to newest. Messages with no such events MUST omit the field. The array MUST NOT include buff events, command events, or award events that lack a matching source message id. A process restart SHALL still restore ids from SQLite.

#### Scenario: Restored like
- **WHEN** the operator granted `like` on message `twitch`/`abc` and later loads recent messages
- **THEN** that message object includes `granted_award_ids` `["like"]`

#### Scenario: Two types
- **WHEN** Joke then Advice were granted on the same source message
- **THEN** `granted_award_ids` is `["joke","advice"]`

#### Scenario: Ordinary chat
- **WHEN** a recent line has never received an award
- **THEN** the message object has no `granted_award_ids` field
