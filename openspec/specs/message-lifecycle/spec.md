# Message Lifecycle

## Purpose

Keeps a bounded in-memory history for admin, dock, and overlay restore, and deletes messages once on the server so every client converges.

## Requirements

### Requirement: History is a bounded recent buffer
The server SHALL keep the most recent chat messages in memory with capacity 100 by default. New messages SHALL append; when capacity is exceeded the oldest entries SHALL be dropped.

#### Scenario: Burst over capacity
- **WHEN** 120 messages have been ingested
- **THEN** `GET /api/messages/recent` returns at most 100, the newest ones

### Requirement: Recent messages are readable
`GET /api/messages/recent` SHALL return `{ "messages": [...] }` in chronological order. An optional `limit` query SHALL cap the result; invalid limit values MAY fall back to the default of 20 for that request.

#### Scenario: Default recent fetch
- **WHEN** a client calls `GET /api/messages/recent` after 5 messages
- **THEN** the response includes those 5 unified messages

### Requirement: Delete is server-authoritative
`POST /api/messages/delete` SHALL require JSON `{ "platform": "...", "id": "..." }`. The server SHALL remove the matching history row and broadcast one `message_deleted` event. Missing platform or id SHALL return 400. Unknown messages SHALL return 404.

#### Scenario: Successful delete
- **WHEN** history contains twitch id `msg1` and the client posts that pair
- **THEN** the response is `{ "deleted": true }`, the row is gone from history, and `/ws` clients receive `message_deleted`

#### Scenario: Unknown message
- **WHEN** the client deletes a platform/id pair that is not in history
- **THEN** the response is 404 `message not found` and no broadcast is required

### Requirement: Identity is platform plus source id
Deletion MUST address a message by connector `platform` plus the connector-provided `id`. The system MUST NOT invent a fallback identity when `id` is empty.

#### Scenario: Empty id rejected
- **WHEN** delete is called with a platform and an empty id
- **THEN** the request is rejected with 400
