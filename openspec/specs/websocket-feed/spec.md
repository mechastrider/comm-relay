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
When viewer session, day, or all-time XP changes (including after merge, a new stream, an award, or an activity grant), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional `avatar_url`, `xp`, `message_count`). Entries MUST NOT include `score`. Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

#### Scenario: Score changes
- **WHEN** an award or activity grant increases a viewer's session XP
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries` that include `xp`

#### Scenario: Unknown type is ignored by chat overlay
- **WHEN** the chat overlay receives a `leaderboard` frame
- **THEN** it does not treat the frame as a chat message row

#### Scenario: Award changes XP
- **WHEN** an award increases a viewer's session XP
- **THEN** connected WebSocket clients receive `type` `leaderboard` with `period` `session` and updated `entries` that include `xp`

#### Scenario: Activity grant
- **WHEN** a silent activity grant increases a viewer's session XP
- **THEN** connected WebSocket clients receive a matching `session` leaderboard frame and MUST NOT receive an `alert` frame for that grant

#### Scenario: Counted line without activity
- **WHEN** a counted chat message increases `message_count` but not XP
- **THEN** connected WebSocket clients still receive `type` `leaderboard` with updated `message_count` for that period

### Requirement: Slow clients do not stall the hub
Each client SHALL have a bounded outbound queue (64 frames). If that queue is full, the hub SHALL drop the current frame for that client and continue broadcasting to others.

#### Scenario: One overlay is stalled
- **WHEN** a client send buffer is full during a chat burst
- **THEN** other connected clients still receive new frames

### Requirement: Alert events use a stable wire envelope
Command and award events SHALL continue to use `type` `"alert"` with `name`, optional `avatar_url`, resolved `text`, `points`, `sound`, `duration_ms`, and `source`. Every alert SHALL include RFC3339 `created_at`. Command alerts SHALL include `trigger`. Award alerts SHALL include `award_id`, `award_name`, and optional `message_platform`, `message_id`, and bounded `message_text`. Optional `image_asset`, `sound_file`, `sound_volume`, `layout`, `image_fit`, and `image_size_pct` MAY be present. These additions MUST remain optional so older clients can ignore them. The chat overlay SHALL inspect award alerts only to highlight a matching visible row; admin, dock, and leaderboard clients MAY otherwise ignore alert frames. Custom media fields MUST be generated filenames, not filesystem paths or remote URLs.

#### Scenario: Message-aware award frame
- **WHEN** Advice is granted from Twitch message `abc`
- **THEN** clients receive one award alert with `award_id`, `award_name`, `message_platform` `twitch`, `message_id` `abc`, and the bounded quote

#### Scenario: Command frame remains compatible
- **WHEN** `!gg` fires
- **THEN** clients receive an alert with `source` `command`, `trigger` `gg`, and no award message context

#### Scenario: Command fire
- **WHEN** `!gg` matches
- **THEN** `/ws` clients receive `type` `alert` with `source` `command` and trigger `gg`

#### Scenario: Chat overlay ignores alerts
- **WHEN** a command alert or an award alert without an exact visible message reference arrives at `/overlay`
- **THEN** the chat queue is unchanged and no message row is inserted

#### Scenario: Award without stable message id
- **WHEN** an award succeeds without a message id
- **THEN** its alert omits `message_platform` and `message_id` and remains renderable

#### Scenario: Command with custom image
- **WHEN** `!gg` fires and command `gg` has `image_asset` set
- **THEN** the alert frame includes that `image_asset` filename, `layout`, and any stored `image_fit` / `image_size_pct` values

### Requirement: Config broadcasts include hide_command_messages
After a successful config update that changes `hide_command_messages`, the hub SHALL include that flag in the public config or overlay settings payload used by overlay clients so they can hide or show new command lines without reload.

#### Scenario: Operator enables hide
- **WHEN** the operator saves `hide_command_messages` true
- **THEN** connected overlay clients receive the updated flag
