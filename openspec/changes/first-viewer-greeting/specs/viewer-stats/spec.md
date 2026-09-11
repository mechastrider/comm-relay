## Purpose

Extend canonical viewer and session state with ordinary-message greeting markers without changing contribution counters.

## MODIFIED Requirements

### Requirement: Chat lines with a stable identity update durable counters
When an ingested chat line has a non-empty `platform` and `user_id`, the system SHALL retain its existing viewer, message-count, and activity-XP behavior. After command matching, a line that does not match an enabled command SHALL atomically record whether it is the canonical viewer's first ordinary message ever and first ordinary message in the current stream session for greeting qualification. Greeting qualification MUST NOT itself alter `xp` or `message_count`.

#### Scenario: First message from a Twitch user
- **WHEN** a Twitch message arrives with `user_id` `42` and display name `Alice` and activity is enabled
- **THEN** a viewer exists for identity `twitch`/`42` with `message_count` 1 and XP equal to `activity_xp` in session, day, and all-time

#### Scenario: Repeat message
- **WHEN** the same identity sends another counted message before `activity_interval_seconds` has elapsed
- **THEN** that viewer's `message_count` increases and last-seen name/avatar reflect the new line and XP is unchanged by that line

#### Scenario: Missing user id
- **WHEN** a chat line has an empty `user_id`
- **THEN** no viewer row is created and existing counters stay unchanged

#### Scenario: First ordinary line after command
- **WHEN** a new identified viewer sends an enabled command followed by an ordinary line
- **THEN** both lines increment existing message counters and only the ordinary line establishes the greeting markers

#### Scenario: Concurrent duplicate intake
- **WHEN** two ordinary lines for the same canonical viewer are processed concurrently before any marker exists
- **THEN** exactly one line is committed as first-ever and first-in-session for greeting qualification

### Requirement: Stream session and stats day are independent periods
The system SHALL retain `POST /api/sessions/start` as the only authoritative manual boundary for returning-viewer greetings. Starting a session SHALL create an empty ordinary-message greeting period independently of day and all-time counters. A stats day transition or process restart MUST NOT create a new greeting period.

#### Scenario: New stream
- **WHEN** the operator starts a new stream
- **THEN** session `message_count` and `xp` for every viewer start at 0 and all-time plus day totals stay unchanged

#### Scenario: Overnight session before reset hour
- **WHEN** `day_reset_hour` is 6 and a session runs from 22:00 to 02:00 local time
- **THEN** those messages share one stats day and one session

#### Scenario: New stream greeting period
- **WHEN** the operator starts a new stream and a known viewer sends an ordinary message
- **THEN** the message is first in the new session even when the viewer has current-day activity

#### Scenario: Restart mid-session
- **WHEN** the process restarts after a viewer's first ordinary session message
- **THEN** a later message in the same session is not treated as first in session
