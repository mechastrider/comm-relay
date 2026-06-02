---
name: backend-structure
description: Backend layout for comm-relay (cmd/, internal/). Use when adding HTTP handlers, connectors, event bus, config, or bootstrap wiring.
---

# Backend structure — Chat Relay

## Repository layout

```text
/
├── cmd/chat-relay/          # main: flags, config path, runnable manager
├── internal/
│   ├── bootstrap/           # load config, wire bus, connectors, HTTP server
│   ├── config/              # config.json types, load/save, defaults
│   ├── bus/                 # Event types, publish/subscribe, fan-out to WS
│   ├── connector/
│   │   ├── twitch/          # IRC or EventSub client
│   │   └── youtube/         # Live Chat API + OAuth token use
│   ├── api/                 # mux, handlers, WebSocket hub, static file routes
│   └── pkg/                 # tiny shared helpers only (avoid junk drawer)
├── web/
│   ├── admin/               # control panel (/)
│   └── overlay/             # OBS page (/overlay)
├── docs/concept.md
└── .agents/skills/
```

## internal/bus

- Single process-wide event dispatcher.
- Connectors call `Publish` with typed events; API layer subscribes and forwards to WebSocket clients.
- Use buffered channels with explicit capacity; document drop or block policy under load.

## internal/connector

- Each platform implements a small interface, e.g. `Run(ctx context.Context) error` plus config binding.
- No HTTP knowledge inside connectors.
- Map inbound platform messages to `ChatMessage` before publish.
- Reconnect loops respect `ctx.Done()` — see [runnable-background-processes](../runnable-background-processes/SKILL.md).

## internal/api

- `net/http` + Go 1.22+ path patterns.
- Routes: `/`, `/overlay`, `/ws`, static assets, OAuth callback paths under e.g. `/oauth/...`.
- WebSocket hub: register clients, broadcast JSON messages, handle ping/pong or read loop for health.
- Helpers: `writeJSON`, `writeError` — see [api-conventions](../api-conventions/SKILL.md).

## internal/config

- Load/save `config.json`; atomic write (temp file + rename) when persisting tokens or settings.
- Validation at load time (required channel when twitch enabled, port range, etc.).

## cmd/chat-relay

- Parse flags (`-config`, `-addr`).
- Build `*slog.Logger` in `main`, set `slog.Default`, bind per-request/per-connector with `clog.NewContext` — see [golang-logging](../golang-logging/SKILL.md).
- Register HTTP server and each connector with `pior/runnable` manager.
- Graceful shutdown on SIGINT/SIGTERM.

## Storage

- **MVP**: JSON config file only (no SQLite unless a change explicitly adopts it).
- OAuth refresh tokens live in config or a sidecar file excluded from logs and VCS (document in README).

## When adding a feature

1. Domain/types → `internal/bus` or `internal/connector/<platform>`
2. HTTP/WebSocket surface → `internal/api`
3. Long-running work → connector `Run` registered as runnable
4. Admin/overlay UX → `web/` — see [web-static-frontend](../web-static-frontend/SKILL.md)
