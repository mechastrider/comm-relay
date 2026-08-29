## MODIFIED Requirements

### Requirement: Mutations use POST-action routes
API mutations SHALL use `POST /api/<resource>/<action>` with identifiers in the JSON body. The API MUST NOT use `PUT`, `DELETE`, or `PATCH`, and MUST NOT put `{id}` path parameters under `/api/`.

#### Scenario: Create command
- **WHEN** the operator saves a new chat command
- **THEN** the client calls `POST /api/commands/create`

#### Scenario: Grant award
- **WHEN** the operator rewards a viewer from a message
- **THEN** the client calls `POST /api/awards/grant` with `platform`, `user_id`, and `award_id` in the JSON body

### Requirement: Reads, health, static, WebSocket, and OAuth callbacks may use GET
The following GET routes SHALL remain available: `/`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/api/viewers`, `/api/viewers/get`, `/api/leaderboard`, `/api/commands`, `/api/awards`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: List commands
- **WHEN** the Audience commands view loads
- **THEN** it uses `GET /api/commands`

#### Scenario: Alert page
- **WHEN** OBS loads the banners Browser Source
- **THEN** it uses `GET /overlay/alert`
