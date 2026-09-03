## MODIFIED Requirements

### Requirement: Admin can list, search, and open a viewer
`GET /api/viewers` SHALL return canonical viewers (not hidden merge sources) with last-seen identity fields, counters for session, day, and all-time, and `platforms`: a JSON array of unique platform ids for that viewer. Platform ids SHALL be unique, lowercase, and ordered with the last-seen platform first, then remaining identities by last-seen time descending. The list MUST NOT include `identities` or per-identity logins. An optional `q` query SHALL filter by display name, username, or platform user id. `GET /api/viewers/get` SHALL accept `id` as a query parameter and return that viewer's identities and counters. Viewer identifiers MUST appear in query or JSON bodies, never as `/api/{id}` path segments.

#### Scenario: Search by name
- **WHEN** the operator requests `GET /api/viewers?q=alice`
- **THEN** the JSON lists matching canonical viewers using snake_case fields including `message_count` and `score` per period

#### Scenario: Merged viewer platforms on the list
- **WHEN** a canonical viewer has Twitch and YouTube identities and Twitch is last seen
- **THEN** `GET /api/viewers` includes that viewer with `platforms` `["twitch","youtube"]` and omits `identities`

#### Scenario: Duplicate platform ids are collapsed
- **WHEN** a viewer has two identities on the same platform
- **THEN** `platforms` contains that platform id once

#### Scenario: Open card
- **WHEN** the operator requests `GET /api/viewers/get?id=<viewer id>` for a known viewer
- **THEN** the JSON includes identities (`platform`, `user_id`, last-seen names/avatar) and period counters
