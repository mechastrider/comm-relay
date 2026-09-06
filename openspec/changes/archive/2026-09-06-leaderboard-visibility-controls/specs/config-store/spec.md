## Purpose

Persist safe global defaults for leaderboard visibility while preserving the always-visible behavior of existing installations.

## ADDED Requirements

### Requirement: Config persists leaderboard visibility policy
`config.json` and public config SHALL expose `leaderboard_visibility` with `policy`, `display_seconds`, `cooldown_seconds`, `dirty_interval_seconds`, `show_on_award`, and `show_on_rank_change`. Policy SHALL be `always`, `automatic`, or `on_request`; numeric bounds SHALL follow the leaderboard-visibility capability; trigger fields SHALL be boolean. New configuration files SHALL default to automatic policy, 15-second display, 300-second cooldown, 900-second dirty interval, and both automatic triggers enabled. Loading an older file with no `leaderboard_visibility` object SHALL use `always` to preserve its shipped behavior.

#### Scenario: New installation defaults
- **WHEN** CommRelay creates a new config file
- **THEN** public config contains the automatic policy and the documented timing and trigger defaults

#### Scenario: Existing installation upgrade
- **WHEN** CommRelay loads a pre-change config without `leaderboard_visibility`
- **THEN** the leaderboard remains always visible until the operator chooses another policy

#### Scenario: Invalid policy
- **WHEN** a config update sends `leaderboard_visibility.policy` `sometimes`
- **THEN** the save is rejected with a field error and the previous policy remains active

#### Scenario: Secrets remain omitted
- **WHEN** a client reads `GET /api/config`
- **THEN** the visibility object is returned without changing existing secret-redaction behavior
