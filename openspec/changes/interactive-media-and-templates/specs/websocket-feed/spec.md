## Purpose

Carry optional custom media, volume, and layout on alert frames without breaking older overlay clients.

## MODIFIED Requirements

### Requirement: Alert events use a stable wire envelope
Command and award events SHALL continue to use `type` `"alert"` with `name`, optional `avatar_url`, resolved `text`, `points`, `sound`, `duration_ms`, and `source`. Every alert SHALL include RFC3339 `created_at`. Command alerts SHALL include `trigger`. Award alerts SHALL include `award_id`, `award_name`, and optional `message_platform`, `message_id`, and bounded `message_text`. Optional `image_asset`, `sound_file`, `sound_volume`, and `layout` MAY be present. These additions MUST remain optional so older clients can ignore them. The chat overlay SHALL inspect award alerts only to highlight a matching visible row; admin, dock, and leaderboard clients MAY otherwise ignore alert frames. Custom media fields MUST be generated filenames, not filesystem paths or remote URLs.

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
- **THEN** the alert frame includes that `image_asset` filename and `layout`
