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
Each ingested chat message SHALL be broadcast as JSON with `type` `"message"`, `platform`, `user` (display name if present, otherwise username), `message`, and optional `id`, `username`, `display_name`, `avatar_url`, `badges`, `fragments`, and RFC3339 `timestamp`. When the connector omits `avatar_url` but the canonical viewer has a resolved portrait, the hub SHALL set `avatar_url` to that resolved URL before broadcast. Resolved URLs MAY be `/overlay/assets/{filename}` for cached or custom files.

#### Scenario: Display name present
- **WHEN** a chat event has both username `alice` and display name `Alice`
- **THEN** the wire payload `user` is `Alice` and `username` is `alice`

#### Scenario: Empty Twitch avatar filled from cache
- **WHEN** a Twitch line has no connector avatar and the viewer already has a cached or custom portrait
- **THEN** the `message` frame includes `avatar_url` pointing at that local asset

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
When viewer session, day, or all-time XP changes (including after merge, a new stream, an award, an activity grant, a leaderboard-hidden toggle, a custom portrait change, or a rank-cap change that requires a refresh), the hub SHALL broadcast JSON with `type` `"leaderboard"`, `period` (`session`, `day`, or `all`), and `entries` as the ranking rows for that period (`rank`, `display_name`, optional resolved `avatar_url`, `xp`, `message_count`). Entries MUST NOT include `score`. Entries MUST omit leaderboard-hidden viewers and MUST contain at most the resolved `max_entries`. Chat overlay and dock clients that do not handle this type MUST continue to process `message` and `message_deleted` frames.

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

#### Scenario: Hide from ranking
- **WHEN** the operator hides a ranked viewer
- **THEN** the next `leaderboard` frames omit that viewer and re-rank the remaining rows

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

### Requirement: Visibility uses a dedicated WebSocket envelope
The production `/ws` feed SHALL broadcast `leaderboard_visibility` frames containing `state` (`hidden`, `timed`, or `pinned`), `policy`, boolean `visible`, nullable RFC3339 `visible_until`, and `reason` (`startup`, `policy`, `manual`, `award`, `rank_change`, `interval`, or `command`). Ranking `leaderboard` frames MUST remain data-only and MUST NOT imply visibility. Clients that ignore the new type SHALL continue processing existing frames.

#### Scenario: Manual timed show
- **WHEN** the operator requests a timed show
- **THEN** clients receive `leaderboard_visibility` with state `timed`, visible true, an absolute deadline, and reason `manual`

#### Scenario: Timer expires
- **WHEN** the authoritative deadline expires
- **THEN** clients receive the configured policy baseline with a null deadline and the applicable policy reason: hidden for `automatic` or `on_request`, pinned and visible for `always`

#### Scenario: Unrelated client
- **WHEN** chat overlay or dock message rendering receives a visibility frame
- **THEN** its existing message behavior remains functional

### Requirement: New production clients receive a visibility snapshot
After a production `/ws` client connects, the server SHALL send the current visibility frame through the normal bounded client queue. Debug `/ws/overlay-debug` clients MUST NOT receive production visibility frames.

#### Scenario: Connect while pinned
- **WHEN** a production client connects while state is pinned
- **THEN** it receives pinned visible state without waiting for another control action

#### Scenario: Debug isolation
- **WHEN** a debug leaderboard client connects
- **THEN** it receives no production visibility snapshot

### Requirement: Contract announcements use an alert envelope
Opening or explicitly repeating an active contract SHALL broadcast one production `/ws` frame with `type` `alert`, `source` `contract`, `contract_id`, `contract_title`, `contract_objective`, `award_id`, `award_name`, positive `points`, RFC3339 `created_at`, and the snapshotted alert presentation fields. Existing clients that do not recognize `source` `contract` MUST continue processing chat, award, command, leaderboard, and settings frames. New connections MUST NOT replay an active or historical contract announcement automatically.

#### Scenario: Open announcement
- **WHEN** a contract is successfully opened
- **THEN** connected production clients receive one contract alert containing the promised task and reward

#### Scenario: Overlay reconnects
- **WHEN** the alert Browser Source reconnects while a contract is active
- **THEN** no announcement is replayed until the operator explicitly announces it again

#### Scenario: Unrelated client
- **WHEN** chat overlay, leaderboard, admin message log, or dock receives a contract alert
- **THEN** its existing message and ranking behavior remains functional

### Requirement: Active contract presentation has an authoritative snapshot
The production `/ws` feed SHALL use a `viewer_contract_state` frame containing `contract` (the public active contract object or null), `content` (`contract` or `leaderboard`), and `visible`. A newly connected client MUST receive the current state. Opening, display changes, award, and no-result close MUST broadcast the updated state only after the authoritative operation succeeds. Clients that do not recognize this frame MUST continue processing known frames.

#### Scenario: Leaderboard connects during an active contract
- **WHEN** the leaderboard Browser Source connects or reconnects while a contract is active
- **THEN** it receives the active contract and current presentation state without replaying the alert announcement

#### Scenario: Contract settles
- **WHEN** award or no-result close commits
- **THEN** connected clients receive `contract=null` and resume ordinary leaderboard behavior

### Requirement: Progression events use a stable aggregate envelope
For one live committed cause, the production feed SHALL publish at most one `viewer_progression` frame containing RFC3339 `created_at`, viewer id, display name, optional resolved `avatar_url`, current `level`, optional `previous_level`, an `achievements` array of newly unlocked id, revision, occurrence, name, and description snapshots, and the resolved progression `layout`, `sound`, `sound_volume`, and `duration_ms`. The frame SHALL include only announce-eligible results; it MUST NOT be sent with an empty result set. Clients that do not recognize the type MUST continue processing existing frames.

#### Scenario: Award causes multiple results
- **WHEN** one award crosses a level threshold and unlocks two announced achievements
- **THEN** clients receive one `viewer_progression` frame containing the level transition and both unlocks

#### Scenario: Administrative backfill
- **WHEN** a rule edit creates backfilled unlock rows
- **THEN** no production `viewer_progression` frame is broadcast

### Requirement: Source alert precedes its progression result
When an award or contract announcement and its derived progression event originate from the same committed operation, the source `alert` frame SHALL be enqueued before the `viewer_progression` frame. A dropped frame for one slow client MUST NOT stall other clients or roll back persisted state.

#### Scenario: Award reaches a new title
- **WHEN** a visible award grants XP that crosses a level threshold
- **THEN** the award alert is published first and the aggregate progression frame follows

### Requirement: Leaderboard snapshots may carry viewer level summaries
Live `leaderboard` entries SHALL add a nullable `level` summary containing stable id, title, and minimum all-time XP. Existing ranking fields and ordering MUST remain unchanged, and clients that ignore `level` MUST remain compatible.

#### Scenario: Ranked viewer has a title
- **WHEN** a leaderboard snapshot includes a viewer whose current level is Veteran
- **THEN** that entry carries the Veteran level summary without changing rank or XP
