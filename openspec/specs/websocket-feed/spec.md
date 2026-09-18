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
After a successful config update that changes `hide_command_messages` or `hide_command_cooldown_overlay`, the hub SHALL include both flags in the public config or overlay settings payload used by overlay clients so they can hide or show new command and cooldown rows without reload.

#### Scenario: Operator enables hide
- **WHEN** the operator saves `hide_command_messages` true
- **THEN** connected overlay clients receive the updated flag

#### Scenario: Operator hides overlay cooldown
- **WHEN** the operator saves `hide_command_cooldown_overlay` true
- **THEN** connected overlay clients receive the updated cooldown-visibility flag

### Requirement: Command outcomes use a dedicated WebSocket envelope
The production `/ws` feed SHALL broadcast JSON with `type` `command_outcome`, `message_platform`, `message_id`, `trigger`, `status` (`fired`, `cooldown`, or `rejected`), and integer `cooldown_remaining_ms` (≥ 0). When `status` is `rejected`, the frame SHALL include `reason` as one of `missing_arg`, `not_found`, `ambiguous`, `self`, `no_award`, `quota`, `already_buffed`, or `award_full`, and MAY include locale-safe `reason_label` (`уточни` / `clarify` for `ambiguous`; short labels for other reasons). `trigger` MUST be the canonical catalog trigger of the matched command when the chat line used an alias or unique one-edit typo. `message_platform` and `message_id` SHALL identify the matched chat line using the same platform plus source id as `message` / `message_deleted`. Frames for cooldown MUST include remaining milliseconds until that identity may fire the same command again. Frames for `fired` MAY set `cooldown_remaining_ms` to the command's configured cooldown in milliseconds (0 when the command has no cooldown). Rejected frames SHALL set `cooldown_remaining_ms` to 0 unless a cooldown also applies. The `message` frame for that line SHALL set `is_command` true on exact trigger, exact alias, unique typo match, or a matched social command including rejections, and MUST remain ordinary (`is_command` absent or false) when the **command-trigger** typo is ambiguous. Clients that ignore the type MUST continue processing `message`, `alert`, and other existing frames. The server MUST NOT consume command cooldown when tagging `is_command` on the `message` frame.

#### Scenario: Fired outcome
- **WHEN** `!gg` fires for a Twitch line with source id `abc`
- **THEN** clients receive `type` `command_outcome` with `status` `fired`, `trigger` `gg`, `message_platform` `twitch`, and `message_id` `abc`

#### Scenario: Alias outcome is canonical
- **WHEN** a viewer sends `!heate` and it matches command `heat`
- **THEN** the `message` frame has `is_command` true, `command_outcome.trigger` is `heat`, and `message_id` identifies the `!heate` line

#### Scenario: Unique typo is marked
- **WHEN** enabled command `heat` is the unique distance-1 winner for `!heate`
- **THEN** the `message` frame has `is_command` true and `command_outcome.trigger` is `heat`

#### Scenario: Ambiguous typo is not marked
- **WHEN** two enabled commands are at distance 1 from the typed token
- **THEN** the `message` frame omits `is_command` or sets it false and no `command_outcome` is published

#### Scenario: Cooldown outcome
- **WHEN** the same identity sends `!gg` again during cooldown
- **THEN** clients receive `status` `cooldown` and `cooldown_remaining_ms` greater than zero, and MUST NOT receive a second command `alert`

#### Scenario: Unrelated client
- **WHEN** a leaderboard-only client receives `command_outcome`
- **THEN** it does not treat the frame as a ranking snapshot or chat row

#### Scenario: Rejected like without nick
- **WHEN** Alice sends `!like` with no remainder
- **THEN** clients receive `status` `rejected`, `reason` `missing_arg`, `trigger` `like`, and `is_command` true on the message

#### Scenario: Ambiguous nick is still a command
- **WHEN** Alice sends `!like alicx` and two session viewers sit at distance 1
- **THEN** clients receive `status` `rejected` and `reason` `ambiguous`
- **AND** the message frame has `is_command` true

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

### Requirement: Recap state uses a stable WebSocket envelope
The production `/ws` feed SHALL use `type` `stream_recap_state` with boolean `visible`, nullable `window`, nullable session `snapshot`, and nullable `all_time`. When a session recap is visible, `snapshot` SHALL contain the bounded recap snapshot. When hidden, `snapshot` and `all_time` SHALL be null. A successful session Show, all-time Show, Hide, or New stream action SHALL publish the resulting state only after authoritative storage and session operations succeed. Clients that do not recognize the type MUST continue processing known frames.

#### Scenario: Show committed recap
- **WHEN** a recap snapshot commits and becomes visible
- **THEN** clients receive one visible `stream_recap_state` with `window` `session` containing that exact snapshot

#### Scenario: Hide recap
- **WHEN** the operator hides recap
- **THEN** clients receive `visible` false with `window` null, `snapshot` null, and `all_time` null

#### Scenario: Unrelated client
- **WHEN** chat, leaderboard, alert, admin, or dock receives a recap frame
- **THEN** its existing behavior remains functional

### Requirement: New production clients receive current recap state
Every newly connected production `/ws` client SHALL receive the current recap state through its bounded client queue. A reconnect while the session window is visible SHALL receive the same stored snapshot. A reconnect while the all-time window is visible SHALL receive the same last-presented `all_time` payload. Startup after a process restart SHALL report hidden. Debug `/ws/overlay-debug` clients MUST NOT receive production recap frames.

#### Scenario: Recap overlay reconnects
- **WHEN** the recap Browser Source reconnects while a recap remains visible
- **THEN** it receives visible state with the unchanged snapshot without another operator action

#### Scenario: Debug isolation
- **WHEN** a dedicated overlay-debug client connects
- **THEN** it receives no production recap state

#### Scenario: Recap overlay reconnects on all-time
- **WHEN** the recap Browser Source reconnects while all-time remains visible
- **THEN** it receives visible state with `window` `all` and the unchanged last all-time presentation

### Requirement: Slow recap clients do not block control actions
Recap broadcasts SHALL use the existing bounded per-client delivery policy. A full client queue MUST NOT roll back a committed snapshot, block other clients, or make Show/Hide fail. Dropped recap state frames MUST be observable through existing WebSocket-drop diagnostics, and reconnect recovery SHALL converge the client.

#### Scenario: Stalled client during Show
- **WHEN** one client queue is full as recap becomes visible
- **THEN** storage and responsive clients succeed while the stalled client can recover the visible state after reconnecting

### Requirement: Debug clients use a dedicated WebSocket route

`GET /ws` SHALL continue to create a production subscription under its existing contract. `GET /ws/overlay-debug` SHALL create a subscription to the one process-global debug audience, while preserving the hub's slow-client protection and reconnect behavior. The two routes MUST NOT exchange content frames, and debug routing MUST NOT be activated by a query parameter on `/ws`.

#### Scenario: Production client connects
- **WHEN** a client upgrades `/ws`
- **THEN** it receives production frames under the existing contract
- **AND** never receives debug scenario content

#### Scenario: Debug client connects
- **WHEN** a client upgrades `/ws/overlay-debug`
- **THEN** it receives current appearance settings and frames from the global debug channel
- **AND** does not receive production content

#### Scenario: Dedicated route is unavailable on an older build
- **WHEN** a test page or client requests `/ws/overlay-debug` from a build that predates this feature
- **THEN** the request returns 404 and cannot fall back to production `/ws`

### Requirement: Debug reset is a generic surface event

The feed SHALL expose a `debug_reset` event to connected debug clients so chat, leaderboard, and alert surfaces can clear transient test state without reloading. Production clients MUST never receive that event.

#### Scenario: Global reset
- **WHEN** Reset, Run, or Replay advances the global run generation
- **THEN** every connected debug surface is eligible to receive `debug_reset`
- **AND** production clients receive no reset frame

### Requirement: Recap state names the visible window
Visible `stream_recap_state` frames SHALL include `window` `session` or `all`. Hidden frames SHALL set `visible` false, `window` null, `snapshot` null, and `all_time` null. When `window` is `session`, `snapshot` SHALL be the stored session recap and `all_time` SHALL be null. When `window` is `all`, `all_time` SHALL be the bounded all-time presentation and `snapshot` SHALL be null. Clients that ignore `window` and `all_time` MUST continue processing known frames. Debug `/ws/overlay-debug` clients MUST NOT receive production recap frames.

#### Scenario: Show all-time
- **WHEN** all-time becomes visible
- **THEN** production clients receive `visible` true, `window` `all`, `all_time` present, and `snapshot` null

#### Scenario: Switch back to session
- **WHEN** the operator shows the stored session recap after all-time
- **THEN** production clients receive `visible` true, `window` `session`, and that exact snapshot
- **AND** `all_time` is null
