## Purpose

Keep manual awards as the main XP source and add a richer deletable seed catalog without resurrecting types the operator already removed.

## MODIFIED Requirements

### Requirement: Operator can grant an award from a chat line
`POST /api/awards/grant` SHALL accept `platform`, `user_id`, and `award_id`, plus optional `message_id` and `message_text` from the selected row. The system SHALL resolve the canonical viewer, add the award `points` to all-time, current-session, and current-day `xp`, append one interaction event, and broadcast one award alert. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award. The server MUST trim `message_text` and limit the transient quote to 280 Unicode code points before broadcast. It MUST NOT persist the quote. Missing source-message fields MUST NOT prevent a valid award grant.

#### Scenario: Grant from a stable message
- **WHEN** the operator grants Advice from a row with `platform`, `user_id`, `message_id`, and message text
- **THEN** XP increases, the interaction event records the message reference, and the award alert includes the bounded transient quote

#### Scenario: Grant joke
- **WHEN** the operator grants Joke to a Twitch user id that already has a viewer
- **THEN** that viewer's XP increases by 10 and one award alert is broadcast

#### Scenario: Grant without a stable message id
- **WHEN** the operator grants an award from a row with a stable viewer identity but no `message_id`
- **THEN** the award succeeds and its alert has no highlightable message reference

#### Scenario: Oversized message snapshot
- **WHEN** a grant includes `message_text` longer than 280 Unicode code points
- **THEN** the award succeeds and the broadcast quote is safely truncated without splitting invalid UTF-8

#### Scenario: Empty user id
- **WHEN** grant is called with an empty `user_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Empty platform
- **WHEN** grant is called with an empty `platform`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown award
- **WHEN** grant is called with an absent or unknown `award_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown viewer identity
- **WHEN** the platform and user id are valid but no viewer exists yet
- **THEN** the system may create the viewer through the ingest identity path and then apply the award

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant because the same message `id` was already rewarded. Each successful grant SHALL add XP and enqueue another alert.

#### Scenario: Joke then advice
- **WHEN** the operator grants Joke and then Advice on the same message
- **THEN** XP increases by 10 then by 50 and two alerts are queued in order

## ADDED Requirements

### Requirement: Additive contribution award seeds
On the migration that introduces these seeds, the system SHALL insert deletable award types when those ids are absent: Spotter (`spotter`, 25), Intel (`intel`, 30), Expert (`expert`, 40), Meme (`meme`, 20), Clutch Help (`clutch`, 50), and MVP (`mvp`, 100), each with a splash template that includes `{name}` and `{points}`. Existing Joke and Advice rows MUST NOT be rewritten. Ids that already exist, including operator-created or previously deleted-and-recreated rows, MUST NOT be replaced. Later startups MUST NOT re-insert a seed the operator deleted after this migration.

#### Scenario: Existing database
- **WHEN** CommRelay starts against a database that already has Joke and Advice and lacks the new ids
- **THEN** `GET /api/awards` includes Joke, Advice, Spotter, Intel, Expert, Meme, Clutch Help, and MVP

#### Scenario: Operator deleted a new seed
- **WHEN** the operator deletes Spotter and the process restarts
- **THEN** Reward pickers no longer offer Spotter
