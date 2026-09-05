# Viewer Stats

## Purpose

Track contribution as XP in session, day, and all-time windows. Count every identified chat line as a message, but grant XP only from operator awards and a capped silent activity policy.

## Requirements

### Requirement: Chat lines with a stable identity update durable counters
When an ingested chat line has a non-empty `platform` and `user_id`, the system SHALL upsert that identity onto a canonical viewer and increment that viewer's `message_count` by 1 for all-time, the current stream session, and the current stats day. The line MUST NOT add XP by itself. After the count update, the system MAY grant activity XP as specified in the activity requirement. Lines without `user_id` SHALL still appear in live chat and MUST NOT create a viewer or change counters.

#### Scenario: First message from a Twitch user
- **WHEN** a Twitch message arrives with `user_id` `42` and display name `Alice` and activity is enabled
- **THEN** a viewer exists for identity `twitch`/`42` with `message_count` 1 and XP equal to `activity_xp` in session, day, and all-time

#### Scenario: Repeat message
- **WHEN** the same identity sends another counted message before `activity_interval_seconds` has elapsed
- **THEN** that viewer's `message_count` increases and last-seen name/avatar reflect the new line and XP is unchanged by that line

#### Scenario: Missing user id
- **WHEN** a chat line has an empty `user_id`
- **THEN** no viewer row is created and existing counters stay unchanged

### Requirement: Identities stay distinct until the operator merges them
Each `(platform, user_id)` pair SHALL map to exactly one canonical viewer. The same display name on two platforms MUST remain two viewers until the operator merges them. The system MUST NOT auto-merge by username or display name.

#### Scenario: Same nick on two platforms
- **WHEN** Twitch user `42` and YouTube user `UC1` both display as `Alice`
- **THEN** the admin viewer list shows two viewers until a merge succeeds

### Requirement: Operator can merge two viewers
`POST /api/viewers/merge` SHALL accept JSON `from_id` and `into_id`. On success the system SHALL move all identities from the source viewer onto the target, add `message_count` and `xp` (all-time, current session, and current day) into the target, hide the source from lists and leaderboards, and record an audit of the merge. Merging a viewer into itself SHALL be rejected. Unmerge is not provided.

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
- **THEN** session `message_count` and `xp` for every viewer start at 0 and all-time plus day totals stay unchanged

#### Scenario: Overnight session before reset hour
- **WHEN** `day_reset_hour` is 6 and a session runs from 22:00 to 02:00 local time
- **THEN** those messages share one stats day and one session

### Requirement: Admin can list, search, and open a viewer
`GET /api/viewers` SHALL return canonical viewers (not hidden merge sources) with last-seen identity fields, counters for session, day, and all-time, and `platforms`: a JSON array of unique platform ids for that viewer. Period counters SHALL use `xp` and `message_count`. The payload MUST NOT include `score`. Platform ids SHALL be unique, lowercase, and ordered with the last-seen platform first, then remaining identities by last-seen time descending. The list MUST NOT include `identities` or per-identity logins. An optional `q` query SHALL filter by display name, username, or platform user id. `GET /api/viewers/get` SHALL accept `id` as a query parameter and return that viewer's identities and the same `xp` counters. Viewer identifiers MUST appear in query or JSON bodies, never as `/api/{id}` path segments.

#### Scenario: Search by name
- **WHEN** the operator requests `GET /api/viewers?q=alice`
- **THEN** the JSON lists matching canonical viewers using snake_case fields including `message_count` and `xp` per period and omits `score`

#### Scenario: Merged viewer platforms on the list
- **WHEN** a canonical viewer has Twitch and YouTube identities and Twitch is last seen
- **THEN** `GET /api/viewers` includes that viewer with `platforms` `["twitch","youtube"]` and omits `identities`

#### Scenario: Duplicate platform ids are collapsed
- **WHEN** a viewer has two identities on the same platform
- **THEN** `platforms` contains that platform id once

#### Scenario: Open card
- **WHEN** the operator requests `GET /api/viewers/get?id=<viewer id>` for a known viewer
- **THEN** the JSON includes identities (`platform`, `user_id`, last-seen names/avatar) and period `xp` counters

### Requirement: Operator may set a canonical display name
`POST /api/viewers/update` SHALL accept JSON `id` and optional `display_name`. A non-empty `display_name` SHALL override the name shown in admin and leaderboards for that canonical viewer. Clearing it SHALL fall back to the last-seen identity display name.

#### Scenario: Override name
- **WHEN** the operator saves display name `Commander` on a viewer
- **THEN** subsequent list, card, and leaderboard payloads use `Commander` for that viewer

### Requirement: Operator awards add score independently of chat ingest
When an award grant succeeds, the system SHALL add the award `points` to the canonical viewer's `xp` for all-time, the current stream session, and the current stats day. This increment is independent of activity grants. Command matching MUST NOT change `xp`.

#### Scenario: Advice during a session
- **WHEN** a viewer with session XP 3 is granted Advice (50)
- **THEN** session, day, and all-time `xp` each increase by 50 and `message_count` is unchanged by the grant

#### Scenario: Leaderboard updates
- **WHEN** an award grant succeeds
- **THEN** subsequent leaderboard snapshots include the new `xp` without waiting for another chat line

### Requirement: Activity grants capped XP for regular participation
When a counted chat line has a stable identity, the system SHALL grant `activity_xp` once to session, day, and all-time `xp` if all of the following are true: `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` are each greater than 0; the viewer has fewer than `activity_session_limit` activity grants in the current stream session; and either the viewer has no activity grant in this session yet or at least `activity_interval_seconds` have elapsed since that viewer's last activity grant in this session. A successful activity grant MUST NOT enqueue an overlay alert and MUST NOT appear in the Reward picker. A process restart MUST preserve the session grant count and last-grant time so the cap and interval are not reset. If any of the three settings is 0, the system MUST NOT grant activity XP.

#### Scenario: First counted line in a session
- **WHEN** activity settings are interval 300, limit 10, and xp 1, and a known identity sends their first counted line of the session
- **THEN** that viewer's session, day, and all-time XP each increase by 1 and no alert is broadcast

#### Scenario: Interval not elapsed
- **WHEN** the same identity sends another counted line 60 seconds later with interval 300
- **THEN** XP is unchanged by that line

#### Scenario: Session limit reached
- **WHEN** a viewer already has 10 activity grants in the current session and the interval has elapsed
- **THEN** a further counted line increments `message_count` only

#### Scenario: Activity disabled
- **WHEN** `activity_xp` is 0 and a known identity sends a counted line
- **THEN** `message_count` increases and XP is unchanged by activity

#### Scenario: Restart mid-session
- **WHEN** a viewer has 3 activity grants this session, the process restarts, and they send another counted line inside the interval
- **THEN** no fourth activity grant is created
