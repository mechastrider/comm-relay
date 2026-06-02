---
name: chat-relay
description: Product and domain rules for Chat Relay (comm-relay). Use when implementing connectors, ChatMessage, WebSocket overlay, OBS browser source, or config behavior.
---

# Chat Relay — domain

Canonical brief: [`docs/concept.md`](../../../docs/concept.md).

## Product goals

- Aggregate chat from multiple streaming platforms into one local process.
- Push messages to OBS via Browser Source (`http://localhost:8080/overlay` by default).
- No dependency on mech-comm or external cloud relays.

## Unified message model

All connectors MUST produce the same shape (names may vary slightly in Go, JSON uses snake_case):

```go
type ChatMessage struct {
    ID          string
    Platform    string // "twitch", "youtube", …
    UserID      string
    Username    string
    DisplayName string
    Message     string
    AvatarURL   string
    Badges      []string
    Timestamp   time.Time
}
```

Overlay and WebSocket clients consume this model only — no Twitch IRC tags or YouTube-specific fields in the wire format unless mapped into generic fields (`badges`, `avatar_url`).

## Event bus (MVP)

Connectors publish to a shared bus. Minimum event type for MVP:

- `ChatMessageReceived` with `ChatMessage` payload.

Optional later: `UserJoined`, `UserLeft`, `StreamStarted`, `StreamStopped`.

## WebSocket wire format (overlay)

Endpoint: `GET /ws` (upgrade).

Example message:

```json
{
  "type": "message",
  "platform": "twitch",
  "user": "Commander",
  "message": "Hello"
}
```

Extend with `display_name`, `avatar_url`, `badges` when available — keep backward-compatible optional fields.

## Platforms

| Phase | Platforms |
|-------|-----------|
| MVP | Twitch (IRC or EventSub — document choice in code/comments) |
| Stage 2 | YouTube Live Chat API + OAuth |
| Later | VK Live, Kick, Trovo |

## Config

- File: `config.json` (path configurable; default beside executable or user data dir).
- Persist OAuth tokens and channel settings securely on disk; never log secrets.
- Example keys: `server_port`, `twitch.enabled`, `twitch.channel`, `youtube.enabled`.

## OBS overlay requirements

- Transparent background for Browser Source.
- Cap visible messages; smooth appear; configurable TTL.
- Auto-scroll; tolerate WebSocket reconnect (client-side backoff).

## Reliability

- Graceful shutdown: cancel context, drain WebSocket broadcast, stop connectors.
- Per-connector reconnect with backoff; log connect/disconnect at Info, failures at Error.
- In-process message delivery should not drop messages on a single slow consumer without an explicit bounded buffer policy (document buffer size).

## Non-goals (MVP)

- React/Vue/Svelte admin UI.
- BTTV/FFZ/7TV (stage 4 in concept).
- Plugin system (research only until post-MVP).

## Open research (from concept)

When touching architecture, consider documenting decisions for:

1. Twitch IRC vs EventSub.
2. YouTube OAuth UX (minimal user steps).
3. JSON vs SQLite for settings/tokens.
4. Plugin boundary for new platforms.
5. Emoji provider memory budget.

## Related skills

- Layout: [backend-structure](../backend-structure/SKILL.md)
- Go implementation: [chat-relay-backend-golang](../chat-relay-backend-golang/SKILL.md)
- HTTP/WS: [api-conventions](../api-conventions/SKILL.md)
- Static UI: [web-static-frontend](../web-static-frontend/SKILL.md)
