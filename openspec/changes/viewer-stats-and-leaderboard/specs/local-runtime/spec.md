## MODIFIED Requirements

### Requirement: Static operator and OBS pages are served from one origin
The system SHALL serve the admin console at `/`, the OBS chat overlay at `/overlay`, the OBS leaderboard at `/overlay/leaderboard`, the OBS messages dock at `/dock/messages`, and shared static assets at `/shared/`. Overlay embedding SHALL remain allowed for local OBS Browser Source use.

#### Scenario: Admin page
- **WHEN** a browser requests `GET /`
- **THEN** the admin HTML document is returned

#### Scenario: Overlay page
- **WHEN** OBS or a browser requests `GET /overlay`
- **THEN** the overlay HTML document is returned

#### Scenario: Leaderboard page
- **WHEN** OBS or a browser requests `GET /overlay/leaderboard`
- **THEN** the leaderboard HTML document is returned

#### Scenario: Dock page
- **WHEN** OBS or a browser requests `GET /dock/messages`
- **THEN** the messages-dock HTML document is returned

## ADDED Requirements

### Requirement: Viewer store is opened beside config and must migrate before serving
The system SHALL keep viewer identities and counters in a SQLite file named `comm-relay.db` in the same directory as `config.json`. On start it SHALL apply pending schema migrations to that file. If the file cannot be opened or migrations fail, the process MUST NOT begin serving HTTP. Operator settings MUST remain in `config.json`.

#### Scenario: First launch with config directory
- **WHEN** CommRelay starts and `comm-relay.db` is absent next to `config.json`
- **THEN** the database file is created, migrations apply, and HTTP serving begins

#### Scenario: Migration failure
- **WHEN** schema migration fails on start
- **THEN** the process exits with an error and does not bind the listen address
