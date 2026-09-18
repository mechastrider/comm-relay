## ADDED Requirements

### Requirement: Command catalog exposes social action fields
`GET /api/commands` and successful `POST /api/commands/create` and `POST /api/commands/update` SHALL include `action` values `alert`, `show_leaderboard`, `like`, and `buff`. Like requests MUST include `award_id`; omitted or unknown ids SHALL return HTTP 400 with a field error on `award_id`. Buff requests MUST include `points` as an integer from 1 through 1000; omitted or out-of-range values SHALL return HTTP 400 with a field error on `points`. Alert and show-leaderboard saves MUST ignore or clear those social fields. Routes stay POST-action.

#### Scenario: Create like via API
- **WHEN** the client posts `POST /api/commands/create` with `trigger` `like`, `action` `like`, and `award_id` `viewer_like`
- **THEN** `GET /api/commands` returns that action and award id

#### Scenario: Buff points required
- **WHEN** the client posts action `buff` without `points`
- **THEN** the response is HTTP 400 with a field error on `points`

### Requirement: Config and levels expose social policy
`GET /api/config` and successful config updates SHALL include `buffs_per_award_per_viewer` and `buff_max_unique_viewers` as integers ≥ 0. Level get/create/update JSON SHALL include `like_quota` and `buff_quota` as integers 0–100. Unknown fields MUST still be rejected. Identifiers stay in query or JSON bodies.

#### Scenario: Read defaults
- **WHEN** the admin requests `GET /api/config` after additive defaults
- **THEN** the JSON includes `buffs_per_award_per_viewer` 1 and `buff_max_unique_viewers` 5

#### Scenario: Invalid cap
- **WHEN** an update sets `buff_max_unique_viewers` to -1
- **THEN** the save is rejected with a field error on `buff_max_unique_viewers`
