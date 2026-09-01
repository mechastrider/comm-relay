# Agents Guide — CommRelay

This guide is for AI agents working on **CommRelay** — a local Go application that aggregates streaming chat (Twitch, YouTube, …) and feeds an OBS Browser Source overlay.

Product brief: [`docs/concept.md`](docs/concept.md) (Russian). Next horizon: [`docs/roadmap.md`](docs/roadmap.md) (Russian). Canonical implemented behavior: [`openspec/specs/`](openspec/specs/).

## Project Overview

- **Local-only**: no cloud relay; one binary, HTTP + WebSocket on localhost.
- **Current product**: Twitch IRC, YouTube Live (page or OAuth), VK Live, WebSocket overlay, admin UI, OBS dock, emotes, and overlay presets as plain HTML/CSS/JS.

## Architecture (target)

```text
comm-relay/
├── cmd/comm-relay-server/    # headless HTTP server, graceful shutdown
├── cmd/comm-relay-desktop/   # Wails desktop (build tag `wails`)
├── internal/
│   ├── bootstrap/        # config load, wiring, runnables
│   ├── config/           # config.json read/write
│   ├── bus/              # internal event channel (ChatMessageReceived, …)
│   ├── connector/        # platform connectors (twitch, youtube, …)
│   ├── api/              # HTTP routes, WebSocket /ws, static admin/overlay
│   └── overlay/          # embedded or served static assets (optional split)
├── web/                  # static admin + overlay + dock (HTML/CSS/JS, no React)
├── openspec/             # spec-driven planning (config, specs, changes)
├── docs/
│   ├── concept.md
│   └── roadmap.md
└── .agents/skills/
```

## Core Principles

1. **Unified chat model**: connectors map platform messages to `ChatMessage`; overlay never branches on platform specifics beyond display metadata.
2. **Resilience**: auto-reconnect per connector; one connector failing must not crash the process.
3. **Simple deployment**: single executable, Windows-friendly, minimal memory.
4. **Logging**: `github.com/muonsoft/clog` (on `log/slog`) — Debug/Info/Warn/Error — see skill `golang-logging`.
5. **Small, explicit changes**: match existing package layout; plan behavior changes as OpenSpec deltas; update `docs/concept.md` / `docs/roadmap.md` only when the product contract or horizon changes.
6. **Changelog for user-visible work**: when a task changes **product behavior** a streamer or OBS operator would notice — config, API contract, admin/overlay/dock UX, connectors as experienced in the UI, or README/FAQ text that changes install, setup, or how to use the app — append concise Russian bullets to `CHANGELOG.md` under `## [Unreleased]` (skill `changelog`). **Skip** marketing and repo-only edits: promo/hero images, banners, screenshots, typos in README that do not change instructions, refactors, file/module splits, tests-only, lint, or internal agent/tooling — even if `web/admin`, `web/overlay`, or README files changed. Never erase or rewrite existing `## [X.Y.Z]` sections while editing Unreleased.

## Language Conventions

- Code identifiers and Go comments: English.
- Agent skills (`SKILL.md`), `AGENTS.md`, and OpenSpec artifacts: English.
- `docs/concept.md` and `docs/roadmap.md` may stay in Russian as the product brief and next-horizon plan.

## Agent Skills

Skills live in **`.agents/skills/<name>/SKILL.md`**. Read the relevant skill before implementing in that area.

**Priority:** project skills → user rules → `.cursor/rules/*.mdc`.

### Domain

| Skill | Use when |
|-------|----------|
| `comm-relay` | Product behavior, `ChatMessage`, platforms, overlay/OBS requirements |
| `backend-structure` | Adding packages under `cmd/`, `internal/` |
| `api-conventions` | HTTP routes, WebSocket `/ws`, JSON shapes — **API is POST-action, never REST** — mutations are `POST /api/<resource>/<action>`; no `PUT`/`DELETE`/`PATCH` or `{id}` paths (guarded by `internal/api/router_guard_test.go`). |

### Go backend

| Skill | Use when |
|-------|----------|
| `comm-relay-backend-golang` | Go style, layers, connectors, bus |
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
| `web-constrained-layout` | Height-capped admin dialogs and split panes (scroll the body; do not clip). Shared web layout skill — not desktop windowing. |
| `ux-form-practices` | Connect forms, settings, accessibility |

### Release and docs

| Skill | Use when |
|-------|----------|
| `changelog` | Preparing releases, editing `CHANGELOG.md`, or writing user-facing release notes |
| `release-announce` | Short Russian social posts (Telegram/VK/Twitter) for a version — `CHANGELOG.md` as source, friendly meaning-first streamer wording |

### Hub / devtools

| Skill | Use when |
|-------|----------|
| `skill-authoring` | Editing or publishing skills in `muonsoft/skills` — hub vs consumer boundaries, `catalog.yaml`, `lint-hub` |
| `task-delegation` | Delegating bounded coding slices; hub skill push/pull workflow |
| `work-intake` | Default research-first entry point for an idea, symptom, question, or underspecified request; investigate the repo before asking and select the appropriate OpenSpec profile/tier |
| `codex-orchestration` | Opt-in Codex-native workflow with Sol design/review, broad Terra slices, desktop-profile QA, and OpenSpec closeout |
| `change-orchestration` | Opt-in Codex/Claude + Cursor workflow for a substantial change: parent-owned design, broad Composer slices, profile QA, fresh review, and closeout |
| `openspec-propose` | Create a change and generate all planning artifacts in one step |
| `openspec-explore` | Think through ideas, problems, and requirements before or during a change |
| `openspec-apply-change` | Implement tasks from an existing change |
| `openspec-update-change` | Revise a change's planning artifacts and keep them coherent |
| `openspec-sync-specs` | Sync canonical specs from a change without archiving |
| `openspec-archive-change` | Archive a completed change |

Cursor also installs the opt-in `/cursor-orchestration` command and its
provider-specific skill under `.cursor/`. Use it only when the user explicitly
requests the Cursor-native Grok + Composer workflow; ordinary task language
starts with `work-intake`.

## OpenSpec workflow

Changes that alter observable behavior are planned using **OpenSpec** (CLI `openspec` 1.8+). Specs describe shipping behavior captured from code; future work is a delta against `openspec/specs/`. For an idea, symptom, or request without a detailed task, start with `work-intake`; it researches the repository and selects the smallest adequate schema before proposal work.

**Key paths**

| Path | Purpose |
|------|---------|
| `openspec/config.yaml` | Project context + per-artifact rules used by the CLI |
| `openspec/specs/<slug>/spec.md` | Canonical specs (living documents, updated in-place) |
| `openspec/changes/<date>-<name>/` | In-progress change proposal |
| `openspec/changes/archive/` | Completed changes (decision record) |

**Schema selection**

| Schema | Use in CommRelay |
|--------|------------------|
| `spec-driven` | Built-in lightweight override for bounded changes that need only proposal/specs/design/tasks |
| `desktop-change` | **Project default.** General CommRelay product work plus Wails shell, Windows/platform integration, filesystem/IPC, install/upgrade, or packaged desktop behavior |

Only the primary project profile is vendored. Represent cross-layer admin,
overlay, HTTP/WebSocket, persistence, connector, and distribution work with
`desktop-change`; mark irrelevant profile artifacts `Not applicable` as their
templates instruct. Installing another full profile is an explicit project
configuration change, not a side effect of task intake.

The active schema determines the artifact graph. The lightweight
`spec-driven` sequence is shown below. Omitting `--schema` uses the configured
`desktop-change` default; use an explicit override only when `work-intake` or
the user selects another profile.

1. `proposal.md` — Why (problem/opportunity, affected capabilities)
2. `specs/<capability>/spec.md` — What (WHEN/THEN/AND requirements per capability)
3. `design.md` — How (decisions, tradeoffs, non-goals)
4. `tasks.md` — Implementation checklist (grouped by area, each item ≤ 2 h)

**CLI** (`openspec` must be installed)

```bash
openspec new change "<name>"                         # scaffold a new change
openspec new change "<name>" --schema "<schema>"     # select a full profile explicitly
openspec schemas --json                             # list available profiles
openspec status --change "<name>" --json            # check artifact status + next steps
openspec instructions <artifact> --change "<name>"  # get template for next artifact
openspec archive "<name>"                            # archive a completed change
```

Use the universal **skills-only** OpenSpec delivery from `.agents`
(`openspec config set delivery skills`). OpenSpec behavior comes from those
skills and the CLI; do not add a second provider-specific OpenSpec workflow.

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
- `golangci-lint run ./...` (config: `.golangci.yml`, v2).
- If you changed `web/**/*.js`: `npm ci` (once) and `npm run lint`.
- If the change is user-visible product behavior (see Core Principle 6 and skill `changelog`): update `CHANGELOG.md` under `[Unreleased]`. Skip changelog for marketing assets, README promo images, and no-behavior refactors of admin/overlay code.
- If preparing a release: move `[Unreleased]` into a versioned section, set the date, and keep README artifact names/install steps in sync.
- If static UI changed: smoke-check overlay (transparent background, message limit) and admin forms.
- If observable behavior changed: keep `openspec/specs/` in sync (change delta → archive or `openspec-sync-specs`).
- State clearly if a check could not be run and why.

## Cursor Cloud specific instructions

CommRelay is a **single Go binary** — no Docker, Node, or database. The VM needs **Go 1.26.3+** (see `go.mod`).

### Dependencies and checks

Standard commands from the repo root (documented in **Completion Checklist** above):

- Refresh modules: `go mod download`
- Tests: `go test ./...` (use `-race` when changing concurrency)
- Build: `go build -o comm-relay ./cmd/comm-relay-server` or `go build ./...`
- **golangci-lint** v2.12.2: `golangci-lint run ./...` (install: `go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.12.2`)
- **ESLint** (static web under `web/`): `npm ci && npm run lint` (Node 22+; config: `eslint.config.js`)

### Running the server

- Default listen address: `127.0.0.1:17877` (`server_port` in `config.json`, created on first run).
- Dev run: `go run ./cmd/comm-relay-server` from repo root (uses `./web` and `./config.json`).
- Desktop: `go build -tags wails -o comm-relay-desktop ./cmd/comm-relay-desktop` (needs Wails + platform WebView deps); config defaults to user config dir.
- Overrides: `-addr` (listen), `-config`, `-web`, `-debug` — see `cmd/comm-relay-server/main.go`.
- For a long-lived background process in Cloud Agent VMs, use **tmux** (see system shell instructions), e.g. session `comm-relay-dev` with `go run ./cmd/comm-relay-server` or a built binary.

### Smoke / hello world

With the server running:

1. `curl -s http://127.0.0.1:17877/health` → `{"status":"ok"}`
2. Browser: `/` (admin), `/overlay` (transparent OBS Browser Source), `/dock/messages` (OBS dock)
3. WebSocket: `GET /ws` for live `message`, `overlay_settings`, and `message_deleted` events

### Gotchas

- Do not commit local `config.json` unless intentionally changing defaults for the repo.
- If port 17877 is in use, stop the other process or pass `-addr 127.0.0.1:<port>`.

<!-- agentmem:closeout:start -->
This repository is registered in agentmem as `mechastrider/comm-relay`.
Run `@closeout for mechastrider/comm-relay` after non-trivial work (skill: `.agents/skills/closeout/SKILL.md`).
Consult `.agents/skills/agent-memory-usage/SKILL.md` for MCP usage.
<!-- agentmem:closeout:end -->
