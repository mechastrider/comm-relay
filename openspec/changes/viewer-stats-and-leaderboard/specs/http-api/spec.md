## MODIFIED Requirements

### Requirement: Mutations use POST-action routes
API mutations SHALL use `POST /api/<resource>/<action>` with identifiers in the JSON body. The API MUST NOT use `PUT`, `DELETE`, or `PATCH`, and MUST NOT put `{id}` path parameters under `/api/`.

#### Scenario: Config save
- **WHEN** the admin saves settings
- **THEN** the client calls `POST /api/config/update`

#### Scenario: Message delete
- **WHEN** the operator deletes a chat line
- **THEN** the client calls `POST /api/messages/delete` with `platform` and `id` in the JSON body

#### Scenario: Viewer merge
- **WHEN** the operator merges two viewers
- **THEN** the client calls `POST /api/viewers/merge` with `from_id` and `into_id` in the JSON body

#### Scenario: New stream session
- **WHEN** the operator starts a new stream
- **THEN** the client calls `POST /api/sessions/start`

### Requirement: Reads, health, static, WebSocket, and OAuth callbacks may use GET
The following GET routes SHALL remain available: `/`, `/overlay`, `/overlay/leaderboard`, `/dock/messages`, `/shared/`, `/health`, `/ws`, `/api/config`, `/api/status`, `/api/diagnostics`, `/api/messages/recent`, `/api/viewers`, `/api/viewers/get`, `/api/leaderboard`, `/overlay/assets/{filename}`, `/oauth/youtube/start`, and `/oauth/youtube/callback`.

#### Scenario: Status poll
- **WHEN** the admin polls connector state
- **THEN** it uses `GET /api/status`

#### Scenario: Leaderboard snapshot
- **WHEN** the leaderboard page loads
- **THEN** it uses `GET /api/leaderboard` with a `period` query
