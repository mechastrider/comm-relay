## Purpose

Record silent activity XP grants in the same durable journal as commands and awards so later achievements can see regular participation.

## ADDED Requirements

### Requirement: Successful activity grants are logged
When an activity grant succeeds, the system SHALL append an event with kind `activity`, `points` equal to `activity_xp`, canonical `viewer_id` when known, and a timestamp. The event MUST NOT include chat text. Activity grants that are skipped because of interval, session limit, or disabled settings MUST NOT be logged.

#### Scenario: First activity grant
- **WHEN** a known identity receives their first activity XP of the session
- **THEN** an interaction event exists with kind `activity` and `points` equal to the configured `activity_xp`

#### Scenario: Interval skip
- **WHEN** a counted line is ignored for activity because the interval has not elapsed
- **THEN** no new `activity` interaction event is appended
