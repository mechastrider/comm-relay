## Purpose

Make an operator award carry enough bounded source-message context to explain and highlight the contribution without turning the interaction log into a chat archive.

## MODIFIED Requirements

### Requirement: Operator can grant an award from a chat line

`POST /api/awards/grant` SHALL accept `platform`, `user_id`, and `award_id`, plus optional `message_id` and `message_text` from the selected row. The system SHALL resolve the canonical viewer, add the award `points` to all-time, current-session, and current-day score, append one interaction event, and broadcast one award alert. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award. The server MUST trim `message_text` and limit the transient quote to 280 Unicode code points before broadcast. It MUST NOT persist the quote. Missing source-message fields MUST NOT prevent a valid award grant.

#### Scenario: Grant from a stable message
- **WHEN** the operator grants Advice from a row with `platform`, `user_id`, `message_id`, and message text
- **THEN** score increases, the interaction event records the message reference, and the award alert includes the bounded transient quote

#### Scenario: Grant joke
- **WHEN** the operator grants Joke to a Twitch user id that already has a viewer
- **THEN** that viewer's score increases by 10 and one award alert is broadcast

#### Scenario: Grant without a stable message id
- **WHEN** the operator grants an award from a row with a stable viewer identity but no `message_id`
- **THEN** the award succeeds and its alert has no highlightable message reference

#### Scenario: Oversized message snapshot
- **WHEN** a grant includes `message_text` longer than 280 Unicode code points
- **THEN** the award succeeds and the broadcast quote is safely truncated without splitting invalid UTF-8

#### Scenario: Empty user id
- **WHEN** grant is called with an empty `user_id`
- **THEN** the request fails with HTTP 400 and no score, event, or alert is produced

#### Scenario: Empty platform
- **WHEN** grant is called with an empty `platform`
- **THEN** the request fails with HTTP 400 and no score, event, or alert is produced

#### Scenario: Unknown award
- **WHEN** grant is called with an absent or unknown `award_id`
- **THEN** the request fails with HTTP 400 and no score, event, or alert is produced

#### Scenario: Unknown viewer identity
- **WHEN** the platform and user id are valid but no viewer exists yet
- **THEN** the system may create the viewer through the ingest identity path and then apply the award
