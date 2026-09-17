# Spec Delta

## MODIFIED Requirements

### Requirement: Admin can list, search, and open a viewer
`GET /api/viewers` SHALL return canonical viewers (not hidden merge sources) with last-seen identity fields, counters for session, day, and all-time, integer `session_count`, and `platforms`: a JSON array of unique platform ids for that viewer. Period counters SHALL use `xp` and `message_count`. `session_count` SHALL be the number of stream sessions in which that viewer has `message_count` greater than 0 and MUST NOT change with the operator's selected session/day/all-time period. `session_count` MUST NOT be confused with `session_message_count`. The payload MUST NOT include `score`. Platform ids SHALL be unique, lowercase, and ordered with the last-seen platform first, then remaining identities by last-seen time descending. The list MUST NOT include `identities` or per-identity logins. An optional `q` query SHALL filter by display name, username, or platform user id. `GET /api/viewers/get` SHALL accept `id` as a query parameter and return that viewer's identities, the same period `xp` counters, and the same `session_count`. Viewer identifiers MUST appear in query or JSON bodies, never as `/api/{id}` path segments.

#### Scenario: Search by name
- **WHEN** the operator requests `GET /api/viewers?q=alice`
- **THEN** the JSON lists matching canonical viewers using snake_case fields including `message_count` and `xp` per period plus `session_count` and omits `score`

#### Scenario: Merged viewer platforms on the list
- **WHEN** a canonical viewer has Twitch and YouTube identities and Twitch is last seen
- **THEN** `GET /api/viewers` includes that viewer with `platforms` `["twitch","youtube"]` and omits `identities`

#### Scenario: Duplicate platform ids are collapsed
- **WHEN** a viewer has two identities on the same platform
- **THEN** `platforms` contains that platform id once

#### Scenario: Open card
- **WHEN** the operator requests `GET /api/viewers/get?id=<viewer id>` for a known viewer
- **THEN** the JSON includes identities (`platform`, `user_id`, last-seen names/avatar), period `xp` counters, and `session_count`

## ADDED Requirements

### Requirement: Participating stream count matches Veteran
`session_count` SHALL equal the number of distinct stream sessions in which the canonical viewer has at least one counted chat line. A session whose only durable activity is XP (award or activity grant) with zero messages MUST count as 0 toward `session_count`. After a successful merge, the target viewer's `session_count` SHALL equal that same participation count for the merged history.

#### Scenario: Three streams with chat
- **WHEN** a viewer sends at least one counted message in each of three stream sessions
- **THEN** list and get return `session_count` 3

#### Scenario: Award-only session excluded
- **WHEN** a viewer receives an award in a session and never sends a counted message in that session
- **THEN** that session does not increase `session_count`

#### Scenario: Merge consolidates participation
- **WHEN** the operator merges viewer A into viewer B and their histories share or add sessions with messages
- **THEN** B's `session_count` equals the number of distinct sessions in which the merged viewer has `message_count` greater than 0
