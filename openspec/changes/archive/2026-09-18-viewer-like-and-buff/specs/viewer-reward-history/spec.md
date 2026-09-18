## MODIFIED Requirements

### Requirement: Reward history exposes durable award entries
`GET /api/reward-history` SHALL return successful award events including operator grants, contract awards, and viewer `like` grants, newest first. Each entry MUST include `id`, `kind` equal to `award`, `viewer_id`, the canonical viewer's current `viewer_display_name`, `reward_id`, the award-name snapshot as `reward_name`, `points`, and RFC3339 `created_at`. The endpoint MUST NOT return command, activity, or buff events. It MUST NOT expose the like giver as a required field.

#### Scenario: Global history
- **WHEN** the operator requests `GET /api/reward-history` after Alice received Advice and Bob later received MVP
- **THEN** the response lists Bob's MVP entry before Alice's Advice entry
- **AND** both entries identify the current canonical viewers and the names captured when the awards were granted

#### Scenario: Non-award events exist
- **WHEN** command and activity events exist beside award events
- **THEN** the reward-history response contains only entries whose `kind` is `award`

#### Scenario: Viewer like appears
- **WHEN** Alice likes Bob with `viewer_like`
- **THEN** global history includes one `viewer_like` row for Bob
- **AND** command and buff events are absent from that response

#### Scenario: Buff is not reward history
- **WHEN** Alice buffs Bob's Spotter
- **THEN** reward history does not gain a Spotter row for the buff
- **AND** the original operator Spotter row is unchanged
