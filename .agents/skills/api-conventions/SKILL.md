---
name: api-conventions
description: HTTP and WebSocket API conventions for comm-relay — routes, snake_case JSON, error responses. Use when implementing internal/api or admin JS fetch calls.
---

# HTTP & WebSocket API conventions

## Routes (MVP)

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Admin control panel (static) |
| `/overlay` | GET | OBS Browser Source page |
| `/ws` | GET | WebSocket upgrade for overlay |
| `/healthz` | GET | Liveness |
| `/api/status` | GET | Connector connection status (JSON) |
| `/api/diagnostics` | GET | Runtime info, message counts, connector statuses |
| `/api/config` | GET/PATCH | Read/update settings (snake_case JSON) |
| `/oauth/youtube/start` | GET | Begin OAuth (redirect) |
| `/oauth/youtube/callback` | GET | OAuth callback |

Adjust paths when implementing; keep this table and `internal/api` router in sync.

## Methods and routing

- **Go 1.22+** patterns on `http.ServeMux`: `"GET /api/status"`
- Path params where needed: `"GET /api/messages/{id}"` (if added later)

## JSON naming

- Request/response fields: **snake_case** — `server_port`, `display_name`, `avatar_url`
- Go struct tags: `` `json:"server_port"` ``

## WebSocket

- Endpoint: `/ws`
- Server → client: chat events per [chat-relay](../chat-relay/SKILL.md)
- Optional server → client: `type: "ping"` / client `pong` for keepalive
- On connect, optionally send recent buffered messages (document limit)

## Response helpers

```go
writeJSON(w, payload)           // 200 + application/json
writeError(w, code, msg string) // {"error":"<msg>"} + status
```

Keep `error` strings short and UI-safe; log details with `clog.Errorf` server-side.

## Status mapping (typical)

| Condition | Status |
|-----------|--------|
| Invalid JSON / validation | 400 |
| Unknown resource | 404 |
| Connector not configured | 409 or 503 (pick one, document) |
| OAuth misconfiguration | 503 |
| Unexpected internal error | 500 |

## Static files

- Serve `web/admin` and `web/overlay` with correct `Content-Type`.
- Overlay: allow embedding; no restrictive `X-Frame-Options` for local OBS use.
- Cache-Control: `no-cache` during development; versioned assets later if needed.

## Admin JS contract

- Mirror snake_case in `fetch` payloads.
- Base URL: same origin (`window.location.origin`) unless config injects port.

## Adding an endpoint

1. Handler on `api.Handler` (or sub-handler)
2. Register in `NewMux`
3. Document JSON shape
4. Add `api_test` — see [golang-tests](../golang-tests/SKILL.md)

## Checklist

- [ ] Appropriate HTTP method
- [ ] snake_case JSON
- [ ] Domain errors mapped via `errors.Is`
- [ ] Errors logged before 5xx
- [ ] WebSocket payload matches overlay skill
