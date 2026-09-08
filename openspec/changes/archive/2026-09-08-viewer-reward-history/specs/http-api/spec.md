## MODIFIED Requirements

### Requirement: Reads, health, static, WebSocket, and OAuth callbacks may use GET
The following GET routes SHALL remain available: `/`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/api/viewers`, `/api/viewers/get`, `/api/leaderboard`, `/api/commands`, `/api/awards`, `/api/reward-history`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: Status poll
- **WHEN** the admin polls connector state
- **THEN** it uses `GET /api/status`

#### Scenario: Leaderboard snapshot
- **WHEN** the leaderboard page loads
- **THEN** it uses `GET /api/leaderboard` with a `period` query

#### Scenario: List commands
- **WHEN** the Audience commands view loads
- **THEN** it uses `GET /api/commands`

#### Scenario: Read reward history
- **WHEN** the Audience History tab or a viewer detail loads award history
- **THEN** it uses `GET /api/reward-history` with query parameters rather than an id path segment

#### Scenario: Alert page
- **WHEN** OBS loads the banners Browser Source
- **THEN** it uses `GET /overlay/alert`
