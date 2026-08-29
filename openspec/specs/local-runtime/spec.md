# Local Runtime

## Purpose

Runs CommRelay as a single local HTTP process that serves admin, overlay, and dock pages, answers health checks, and shuts down without crashing other work.

## Requirements

### Requirement: Process listens on a configurable local HTTP address
The system SHALL listen for HTTP on the configured `server_port` (default `17877`) unless an explicit listen address override is provided. The default product URL SHALL be loopback (`127.0.0.1`) so the relay stays a local OBS helper rather than a public service.

#### Scenario: Default listen port
- **WHEN** CommRelay starts with a fresh `config.json`
- **THEN** it listens on port `17877`

#### Scenario: Explicit listen override
- **WHEN** the operator starts the server with an address override such as `-addr 127.0.0.1:<port>`
- **THEN** the process binds that address instead of `server_port`

### Requirement: Health endpoint reports liveness
The system SHALL expose `GET /health` returning JSON `{"status":"ok"}` with HTTP 200 while the HTTP server is accepting requests.

#### Scenario: Health check succeeds
- **WHEN** a client requests `GET /health` on a running process
- **THEN** the response status is 200 and the body is `{"status":"ok"}`

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

### Requirement: Viewer store is opened beside config and must migrate before serving
The system SHALL keep viewer identities and counters in a SQLite file named `comm-relay.db` in the same directory as `config.json`. On start it SHALL apply pending schema migrations to that file. If the file cannot be opened or migrations fail, the process MUST NOT begin serving HTTP. Operator settings MUST remain in `config.json`.

#### Scenario: First launch with config directory
- **WHEN** CommRelay starts and `comm-relay.db` is absent next to `config.json`
- **THEN** the database file is created, migrations apply, and HTTP serving begins

#### Scenario: Migration failure
- **WHEN** schema migration fails on start
- **THEN** the process exits with an error and does not bind the listen address

### Requirement: Graceful shutdown stops HTTP and background workers
On stop or interrupt the system SHALL cancel worker context, shut down the HTTP server, close the event bus, and stop connectors. Shutdown SHALL complete within the process shutdown timeout rather than aborting mid-request without cleanup.

#### Scenario: Stop after start
- **WHEN** a running app receives Stop
- **THEN** HTTP, WebSocket hub, history, and connectors stop and Stop returns without leaving orphaned listeners

### Requirement: Connector failure does not take down the process
Each platform connector SHALL run as an isolated background worker. If one connector returns an error, the system SHALL log it and keep HTTP, overlay, and the remaining connectors running.

#### Scenario: One connector errors
- **WHEN** the Twitch connector stops with an error while YouTube remains healthy
- **THEN** `/health` still succeeds and YouTube messages continue to flow
