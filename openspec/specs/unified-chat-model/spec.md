# Unified Chat Model

## Purpose

All platforms publish the same chat event shape so overlay, dock, and admin never branch on platform-specific payloads beyond display metadata.

## Requirements

### Requirement: Connectors publish a unified chat message
Every connector SHALL map a platform chat line to one `ChatMessageReceived` event with `id`, `platform`, `user_id`, `username`, `display_name`, `message`, optional `fragments`, `avatar_url`, `badges`, and `timestamp`. Platform identifiers SHALL be `twitch`, `youtube`, or `vk`.

#### Scenario: Twitch line becomes a unified event
- **WHEN** Twitch IRC delivers a PRIVMSG
- **THEN** subscribers receive `ChatMessageReceived` with `platform` `twitch` and the chat text in `message`

#### Scenario: Overlay does not need IRC tags
- **WHEN** the overlay renders a Twitch message
- **THEN** it uses only unified fields (`platform`, `display_name`/`user`, `message`, `fragments`, `avatar_url`, `badges`)

### Requirement: Optional fragments describe rich inline content
When a connector can identify emotes or safe image links, it SHALL attach `fragments` as an ordered list of blocks with `type` `text`, `emote`, or `image_link`. Unknown fragment types SHALL be ignored by clients. Plain `message` MUST remain present so older clients still show the line.

#### Scenario: Message with a native emote
- **WHEN** a Twitch message contains a mapped emote
- **THEN** `fragments` includes `text` and `emote` blocks and `message` still contains the original line

#### Scenario: Connector cannot enrich
- **WHEN** emote metadata is unavailable
- **THEN** the event is still published with plain `message` and without required fragments

### Requirement: The in-process bus fans out without blocking publishers
The event bus SHALL deliver each event to all subscribers on bounded buffers. If a subscriber is slow, that subscriber MAY drop the event; other subscribers MUST still receive it. Publishing on a closed bus SHALL fail without panicking.

#### Scenario: Slow subscriber
- **WHEN** one subscriber's buffer is full and a new chat event is published
- **THEN** that event is dropped for the slow subscriber and delivered to others
