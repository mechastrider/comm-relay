## ADDED Requirements

### Requirement: Command JSON includes aliases
`GET /api/commands` and successful `POST /api/commands/create` and `POST /api/commands/update` responses SHALL include `aliases` as a JSON array of slugs (empty array when none). Create and update requests MAY include `aliases`. Omitted `aliases` SHALL mean an empty list. Unknown fields MUST still be rejected. Duplicate, invalid, or colliding aliases MUST return HTTP 400 with a field error on `aliases`. A trigger that collides with another command's alias MUST return HTTP 400 with a field error on `trigger`. Routes stay POST-action; no new command endpoints.

#### Scenario: List includes aliases
- **WHEN** the operator saved `heat` with alias `heate`
- **THEN** `GET /api/commands` returns that command with `aliases` `["heate"]`

#### Scenario: Create with aliases
- **WHEN** the client posts `POST /api/commands/create` with `trigger` `heat` and `aliases` `["heate"]`
- **THEN** the response includes those aliases and later `!heate` can match

#### Scenario: Collision on aliases
- **WHEN** `POST /api/commands/update` sets `aliases` to a slug already used as another command's trigger
- **THEN** the response is HTTP 400 with a field error on `aliases` and the stored catalog is unchanged

#### Scenario: Trigger collides with alias
- **WHEN** `POST /api/commands/create` uses a `trigger` that equals another command's alias
- **THEN** the response is HTTP 400 with a field error on `trigger`

#### Scenario: Omitted aliases
- **WHEN** `POST /api/commands/create` omits `aliases`
- **THEN** the stored command has `aliases` `[]`
