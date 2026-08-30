# Viewer Stats

## Purpose

Persists chat viewers across platforms as identities that can be merged into one person, tracks message counts and score over session, calendar day, and all-time, and gives the operator a people workspace to search, inspect, and merge them.

## Requirements

### Requirement: Chat lines with a stable identity update durable counters
When an ingested chat line has a non-empty `platform` and `user_id`, the system SHALL upsert that identity onto a canonical viewer and increment that viewer's `message_count` by 1 and `score` by the configured `points_per_message` (default 1) for all-time, the current stream session, and the current stats day. Lines without `user_id` SHALL still appear in live chat and MUST NOT create a viewer or change counters.

#### Scenario: First message from a Twitch user
- **WHEN** a Twitch message arrives with `user_id` `42` and display name `Alice`
- **THEN** a viewer exists for identity `twitch`/`42` with `message_count` 1 and `score` equal to `points_per_message`

#### Scenario: Repeat message
- **WHEN** the same identity sends another message
- **THEN** that viewer's `message_count` and `score` increase again and last-seen name/avatar reflect the new line

#### Scenario: Missing user id
- **WHEN** a chat line has an empty `user_id`
- **THEN** no viewer row is created and existing counters stay unchanged

### Requirement: Identities stay distinct until the operator merges them
Each `(platform, user_id)` pair SHALL map to exactly one canonical viewer. The same display name on two platforms MUST remain two viewers until the operator merges them. The system MUST NOT auto-merge by username or display name.

#### Scenario: Same nick on two platforms
- **WHEN** Twitch user `42` and YouTube user `UC1` both display as `Alice`
- **THEN** the admin viewer list shows two viewers until a merge succeeds

### Requirement: Operator can merge two viewers
`POST /api/viewers/merge` SHALL accept JSON `from_id` and `into_id`. On success the system SHALL move all identities from the source viewer onto the target, add `message_count` and `score` (all-time, current session, and current day) into the target, hide the source from lists and leaderboards, and record an audit of the merge. Merging a viewer into itself SHALL be rejected. Unmerge is not provided.

#### Scenario: Cross-platform merge
- **WHEN** the operator merges viewer A into viewer B
- **THEN** both identities appear on B, B's counters are the sums, and A no longer appears in `GET /api/viewers` or leaderboards

#### Scenario: Self-merge rejected
- **WHEN** `from_id` equals `into_id`
- **THEN** the request fails with HTTP 400 and no counters change

### Requirement: Stream session and stats day are independent periods
The system SHALL keep one current stream session. If none is open at start, it SHALL open one. `POST /api/sessions/start` SHALL end the current session and open a new empty session. The stats day key SHALL use the operator's local timezone and `day_reset_hour` (0–23, default 6). Session totals MUST NOT reset at the day boundary; day totals MUST NOT reset when a new session starts.

#### Scenario: New stream
- **WHEN** the operator confirms a new stream
- **THEN** session `message_count` and `score` for every viewer start at 0 and all-time plus day totals stay unchanged

#### Scenario: Overnight session before reset hour
- **WHEN** `day_reset_hour` is 6 and a session runs from 22:00 to 02:00 local time
- **THEN** those messages share one stats day and one session

### Requirement: Admin can list, search, and open a viewer
`GET /api/viewers` SHALL return canonical viewers (not hidden merge sources) with last-seen identity fields and counters for session, day, and all-time. An optional `q` query SHALL filter by display name, username, or platform user id. `GET /api/viewers/get` SHALL accept `id` as a query parameter and return that viewer's identities and counters. Viewer identifiers MUST appear in query or JSON bodies, never as `/api/{id}` path segments.

#### Scenario: Search by name
- **WHEN** the operator requests `GET /api/viewers?q=alice`
- **THEN** the JSON lists matching canonical viewers using snake_case fields including `message_count` and `score` per period

#### Scenario: Open card
- **WHEN** the operator requests `GET /api/viewers/get?id=<viewer id>` for a known viewer
- **THEN** the JSON includes identities (`platform`, `user_id`, last-seen names/avatar) and period counters

### Requirement: Operator may set a canonical display name
`POST /api/viewers/update` SHALL accept JSON `id` and optional `display_name`. A non-empty `display_name` SHALL override the name shown in admin and leaderboards for that canonical viewer. Clearing it SHALL fall back to the last-seen identity display name.

#### Scenario: Override name
- **WHEN** the operator saves display name `Commander` on a viewer
- **THEN** subsequent list, card, and leaderboard payloads use `Commander` for that viewer

### Requirement: Operator awards add score independently of chat ingest
When an award grant succeeds, the system SHALL add the award `points` to the canonical viewer's `score` for all-time, the current stream session, and the current stats day. This increment is in addition to any `points_per_message` applied at ingest. Command matching MUST NOT change `score`.

#### Scenario: Advice during a session
- **WHEN** a viewer with session score 3 is granted Advice (50)
- **THEN** session, day, and all-time `score` each increase by 50 and `message_count` is unchanged by the grant

#### Scenario: Leaderboard updates
- **WHEN** an award grant succeeds
- **THEN** subsequent leaderboard snapshots include the new score without waiting for another chat line
