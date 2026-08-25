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

### Requirement: Slow clients do not stall the hub
Each client SHALL have a bounded outbound queue (64 frames). If that queue is full, the hub SHALL drop the current frame for that client and continue broadcasting to others.

#### Scenario: One overlay is stalled
- **WHEN** a client send buffer is full during a chat burst
- **THEN** other connected clients still receive new frames
