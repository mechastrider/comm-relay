# WebSocket Feed

## Purpose

Pushes live chat, overlay settings, and deletion events to admin, dock, and OBS overlay clients over a single `/ws` endpoint.

## Requirements

### Requirement: Clients connect with a WebSocket upgrade
The system SHALL accept `GET /ws` WebSocket upgrades from local OBS and admin origins. Origin checks MAY allow any origin because the server is intended for localhost use.

#### Scenario: Overlay connects
- **WHEN** the overlay page opens a WebSocket to `/ws`
- **THEN** the upgrade succeeds and the client is registered on the hub

### Requirement: Chat events use a stable wire envelope
Each ingested chat message SHALL be broadcast as JSON with `type` `"message"`, `platform`, `user` (display name if present, otherwise username), `message`, and optional `id`, `username`, `display_name`, `avatar_url`, `badges`, `fragments`, and RFC3339 `timestamp`.

#### Scenario: Display name present
- **WHEN** a chat event has both username `alice` and display name `Alice`
- **THEN** the wire payload `user` is `Alice` and `username` is `alice`

### Requirement: Overlay settings are pushed after config save
After a successful config update, the hub SHALL broadcast `{ "type": "overlay_settings", "overlay": <overlay config> }` so connected overlays apply appearance without reload.

#### Scenario: Operator changes theme
- **WHEN** the admin saves a new overlay theme
- **THEN** connected overlay clients receive `overlay_settings` with the new overlay object

### Requirement: Deletions are broadcast as a generic event
When a message is deleted, the hub SHALL broadcast `{ "type": "message_deleted", "platform": "<platform>", "id": "<id>" }` so admin, dock, and overlay remove the same row without platform-specific client logic.

#### Scenario: Deleted message
- **WHEN** `POST /api/messages/delete` succeeds for Twitch id `abc`
- **THEN** every WebSocket client receives `type` `message_deleted` with `platform` `twitch` and `id` `abc`

### Requirement: Leaderboard snapshots are broadcast as a generic event
When viewer session, day, or all-time scores change (including after merge or a new stream), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional `avatar_url`, `score`, `message_count`). Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

#### Scenario: Score changes
- **WHEN** a counted chat message increases a viewer's session score
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries`

#### Scenario: Unknown type is ignored by chat overlay
- **WHEN** the chat overlay receives a `leaderboard` frame
- **THEN** it does not treat the frame as a chat message row

### Requirement: Slow clients do not stall the hub
Each client SHALL have a bounded outbound queue (64 frames). If that queue is full, the hub SHALL drop the current frame for that client and continue broadcasting to others.

#### Scenario: One overlay is stalled
- **WHEN** a client send buffer is full during a chat burst
- **THEN** other connected clients still receive new frames

### Requirement: Alert events use a stable wire envelope
When a command fires or an award is granted, the hub SHALL broadcast JSON with `type` `"alert"`, resolved splash `text`, `name`, optional `avatar_url`, `points`, `sound`, `duration_ms`, and optional `source` (`command` or `award`) plus the command trigger or `award_id`. Chat overlay, leaderboard, admin, and dock clients SHALL ignore unknown types, including `alert`.

#### Scenario: Command fire
- **WHEN** `!gg` matches
- **THEN** `/ws` clients receive `type` `alert` with `source` `command` and trigger `gg`

#### Scenario: Chat overlay ignores alerts
- **WHEN** an `alert` frame arrives at `/overlay`
- **THEN** the chat queue is unchanged except for the separate `message` frame of the chat line

### Requirement: Config broadcasts include hide_command_messages
After a successful config update that changes `hide_command_messages`, the hub SHALL include that flag in the public config or overlay settings payload used by overlay clients so they can hide or show new command lines without reload.

#### Scenario: Operator enables hide
- **WHEN** the operator saves `hide_command_messages` true
- **THEN** connected overlay clients receive the updated flag
