# Agents Guide — Chat Relay (comm-relay)

This guide is for AI agents working on **Chat Relay** — a local Go application that aggregates streaming chat (Twitch, YouTube, …) and feeds an OBS Browser Source overlay.

Source of product requirements: [`docs/concept.md`](docs/concept.md).

## Project Overview

- **Local-only**: no cloud relay; one binary, HTTP + WebSocket on localhost.
- **MVP**: Twitch IRC, WebSocket to overlay, admin UI and OBS overlay as plain HTML/CSS/JS.
- **Later**: YouTube Live Chat (OAuth), more platforms, emoji providers (BTTV/FFZ/7TV).

## Architecture (target)

```text
comm-relay/
├── cmd/chat-relay/       # main: HTTP server, graceful shutdown
├── internal/
│   ├── bootstrap/        # config load, wiring, runnables
│   ├── config/           # config.json read/write
│   ├── bus/              # internal event channel (ChatMessageReceived, …)
│   ├── connector/        # platform connectors (twitch, youtube, …)
│   ├── api/              # HTTP routes, WebSocket /ws, static admin/overlay
│   └── overlay/          # embedded or served static assets (optional split)
├── web/                  # static admin + overlay (HTML/CSS/JS, no React on MVP)
├── docs/
│   └── concept.md
└── .agents/skills/
```

## Core Principles

1. **Unified chat model**: connectors map platform messages to `ChatMessage`; overlay never branches on platform specifics beyond display metadata.
2. **Resilience**: auto-reconnect per connector; one connector failing must not crash the process.
3. **Simple deployment**: single executable, Windows-friendly, minimal memory.
4. **Logging**: `github.com/muonsoft/clog` (on `log/slog`) — Debug/Info/Warn/Error — see skill `golang-logging`.
5. **Small, explicit changes**: match existing package layout; update `docs/concept.md` only when the product contract changes.

## Language Conventions

- Code identifiers and Go comments: English.
- Agent skills (`SKILL.md`) and `AGENTS.md`: English.
- `docs/concept.md` may stay in Russian as the product brief.

## Agent Skills

Skills live in **`.agents/skills/<name>/SKILL.md`**. Read the relevant skill before implementing in that area.

**Priority:** project skills → user rules → `.cursor/rules/*.mdc`.

### Domain

| Skill | Use when |
|-------|----------|
| `chat-relay` | Product behavior, `ChatMessage`, platforms, overlay/OBS requirements |
| `backend-structure` | Adding packages under `cmd/`, `internal/` |
| `api-conventions` | HTTP routes, WebSocket `/ws`, JSON shapes |

### Go backend

| Skill | Use when |
|-------|----------|
| `chat-relay-backend-golang` | Go style, layers, connectors, bus |
| `golang-errors` | Error wrapping and sentinels (`github.com/muonsoft/errors`) |
| `golang-logging` | `github.com/muonsoft/clog`, contextual logging |
| `golang-validation` | Optional: `github.com/muonsoft/validation` for config/API DTOs |
| `golang-tests` | Handler and connector tests (`api-testing`, testify) |
| `runnable-background-processes` | Connectors and workers via `pior/runnable` |
| `connector-oauth` | YouTube (and similar) OAuth flows in the admin UI |

### Frontend (MVP)

| Skill | Use when |
|-------|----------|
| `web-static-frontend` | Admin panel and OBS overlay under `web/` |
| `ux-form-practices` | Connect forms, settings, accessibility |

## Backend Guidelines

- Go under `cmd/` and `internal/`.
- **Muonsoft stack:** `github.com/muonsoft/errors`, `github.com/muonsoft/clog`, `github.com/muonsoft/api-testing` (tests). See skills `golang-errors`, `golang-logging`, `golang-tests`.
- Do not use `fmt.Errorf` for wrapped errors.
- Do not use bare `slog` in `internal/` business code — bootstrap/middleware bind loggers with `clog.NewContext`.

## Completion Checklist For Agents

Before reporting a task as done:

- Review `git diff` — only relevant files changed.
- `gofmt` / `goimports` on touched Go files.
- `go test ./...` (or targeted packages); `-race` when changing concurrency.
- `golangci-lint run ./...` when `.golangci.yml` exists.
- If static UI changed: smoke-check overlay (transparent background, message limit) and admin forms.
- State clearly if a check could not be run and why.

## Cursor Cloud specific instructions

Chat Relay is a **single Go binary** — no Docker, Node, or database. The VM needs **Go 1.26.3+** (see `go.mod`).

### Dependencies and checks

Standard commands from the repo root (documented in **Completion Checklist** above):

- Refresh modules: `go mod download`
- Tests: `go test ./...` (use `-race` when changing concurrency)
- Build: `go build -o chat-relay ./cmd/chat-relay` or `go build ./...`
- **golangci-lint**: not configured yet (no `.golangci.yml`); skip until added

### Running the server

- Default listen address: `127.0.0.1:17877` (`server_port` in `config.json`, created on first run).
- Dev run: `go run ./cmd/chat-relay` from repo root (uses `./web` and `./config.json`).
- Overrides: `-addr` (listen), `-config`, `-web`, `-debug` — see `cmd/chat-relay/main.go`.
- For a long-lived background process in Cloud Agent VMs, use **tmux** (see system shell instructions), e.g. session `chat-relay-dev` with `go run ./cmd/chat-relay` or a built binary.

### Smoke / hello world (current scaffold)

With the server running:

1. `curl -s http://127.0.0.1:17877/health` → `{"status":"ok"}`
2. Browser: `/` (admin placeholder), `/overlay` (transparent background for OBS)

WebSocket (`/ws`) and Twitch ingest are **not implemented yet**; full chat E2E requires those tasks (see `docs/task-tracker.md`).

### Gotchas

- Do not commit local `config.json` unless intentionally changing defaults for the repo.
- If port 17877 is in use, stop the other process or pass `-addr 127.0.0.1:<port>`.
