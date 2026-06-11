---
name: comm-relay-backend-golang
description: Go backend style for comm-relay (cmd/comm-relay-server, internal/). Use when editing handlers, connectors, bus, config, or bootstrap.
---

# Go backend — CommRelay

Applies to `cmd/comm-relay-server` and `internal/`.

Goals: idiomatic Go, clear package boundaries, testable connectors via interfaces, local-first single binary.

## Layers

| Package | Role |
|---------|------|
| `internal/api` | HTTP, WebSocket, static routes, JSON |
| `internal/bus` | Internal events, fan-out to subscribers |
| `internal/connector/*` | Platform chat ingestion |
| `internal/config` | `config.json` load/save |
| `internal/bootstrap` | Wiring and runnable registration |

Prefer **interfaces** at connector boundaries for tests (`Connector`, `Publisher`).

## Formatting and imports

- Run `gofmt` / `goimports` on changed files.
- Import groups: stdlib → external → module path (alphabetical within each).

## Linting

- Use root `.golangci.yml` when present.
- Prefer narrow `//nolint` / `// #nosec` with reason over broad excludes.

## Code style

- Functions: verbs (`RunConnector`, `PublishMessage`, `ServeHTTP`).
- Early returns; nesting depth ≤ 3.
- I/O functions: `context.Context` first; do not store context in struct fields.
- Avoid more than two bare return values — use a small struct when needed.

## Errors and logging

- Errors: `github.com/muonsoft/errors` — see [golang-errors](../golang-errors/SKILL.md).
- Logging: `github.com/muonsoft/clog` — see [golang-logging](../golang-logging/SKILL.md).
- **No panic** in production paths; return `error`.
- Do not ignore errors (`_ = err` forbidden).

## HTTP handlers

- Map domain sentinels to 4xx (bad config, unknown platform) via `errors.Is`.
- Use shared `writeJSON` / `writeError` helpers in `internal/api`.
- Wrap unexpected failures with `errors.Errorf` before logging and 500 responses.

## Concurrency

- Background connectors: `pior/runnable` — see [runnable-background-processes](../runnable-background-processes/SKILL.md).
- WebSocket hub: protect client map with mutex; respect context on shutdown.
- Goroutines exit when `ctx` is cancelled.

## API JSON

- **snake_case** JSON tags — see [api-conventions](../api-conventions/SKILL.md).
- WebSocket payloads match overlay contract in [comm-relay](../comm-relay/SKILL.md).

## Related skills

- Product: [comm-relay](../comm-relay/SKILL.md)
- Structure: [backend-structure](../backend-structure/SKILL.md)
- Tests: [golang-tests](../golang-tests/SKILL.md)

## Pre-commit checklist

- [ ] `gofmt` / `goimports` on touched Go files
- [ ] `golangci-lint run` passes (when configured)
- [ ] Tests for changed behavior
- [ ] No debug logging or token leakage left behind
