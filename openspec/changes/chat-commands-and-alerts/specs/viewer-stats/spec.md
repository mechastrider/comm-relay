## ADDED Requirements

### Requirement: Operator awards add score independently of chat ingest
When an award grant succeeds, the system SHALL add the award `points` to the canonical viewer's `score` for all-time, the current stream session, and the current stats day. This increment is in addition to any `points_per_message` applied at ingest. Command matching MUST NOT change `score`.

#### Scenario: Advice during a session
- **WHEN** a viewer with session score 3 is granted Advice (50)
- **THEN** session, day, and all-time `score` each increase by 50 and `message_count` is unchanged by the grant

#### Scenario: Leaderboard updates
- **WHEN** an award grant succeeds
- **THEN** subsequent leaderboard snapshots include the new score without waiting for another chat line
