---
name: agentmem-onboarding
description: Interactive first-time onboarding for a freshly bootstrapped repository. Run after `agentmem projects bootstrap` to elicit project intent, register the project with `agentmem projects attach`, and hand off to the preset skill set.
---

# Agentmem onboarding

Run this skill **after** `agentmem projects bootstrap` has laid down local agent artifacts
(`AGENTS.md`, `.agents/skills/agentmem-onboarding/`, and the Claude symlinks) but **before**
the project is registered in agentmem. This is the interactive phase: you and the human turn
a fresh repo into a registered agentmem project.

Principle: *agentmem captures memory and skills — it does not own project templates.* Real
project scaffolding is delegated to the ecosystem's own tools.

## When to run

| Run this skill | Skip |
| -------------- | ---- |
| A repo just bootstrapped, not yet registered (`attach` not run) | Project already registered — use the preset skills |
| The human wants to describe what they are building and get it onboarded | Pure exploration with no intent to register |

## Procedure

### 1. Ask what they are building

Ask the human one question, offering choices:

- Web app
- Desktop app
- CLI tool
- Library / package
- Backend service
- Automation / bots
- Content / docs site
- Prototype / unsure
- Other (capture a short description)

### 2. Confirm the stack

Read manifest hints in the repo root and nearby paths, then confirm with the human:

| Hint file | Typical stack |
|-----------|---------------|
| `go.mod` | Go |
| `package.json` | Node / JS / TS |
| `Cargo.toml` | Rust |
| `pyproject.toml` / `requirements.txt` | Python |
| `Gemfile` | Ruby |

If manifests are absent (empty repo), note that scaffolding comes in step 6.

### 3. Map answers to attach flags

Pick **conservative** values. Domains and presets are validated server-side; if `attach`
fails with an unknown slug, read the error's list of valid values and retry once.

| Human answer | `--primary-domain` | `--preset` | `--priority` | `--notes` |
|--------------|-------------------|------------|--------------|-----------|
| Web app | `web-app` | `web-app` | `important` | One-line product summary |
| Desktop app | `desktop-app` | `desktop-app` | `important` | Platform + UI stack |
| Mobile app | `mobile-app` | `mobile-app` | `important` | Platform + UI stack |
| CLI tool | `devtool` | `devtool` | `normal` | What the CLI does |
| Library / package | `library` | `library` | `normal` | Package purpose + language |
| Backend service | `infrastructure` | `infrastructure` | `important` | Service role + runtime |
| Automation / bots | `automation` | `automation` | `normal` | Trigger + target systems |
| Content / docs site | `content-site` | `content-site` | `normal` | Audience + generator |
| Prototype / unsure | `experimental` | `experimental` | `normal` | What you're exploring |

Optional: `--adoption-status enabled`, `--secondary-domain`, `--workflow-hint` when the human
supplies them.

### 4. Ensure CLI login

The human (or you, with their approval) must authenticate before `attach` writes to the
registry:

```bash
agentmem server login --server <url>
```

The device flow opens `<url>/cli-auth?device=…` — approve it in the UI while signed in as a
curator/admin. Curator approval grants **registry write**; without it, `attach` exits 2.
On auth-disabled instances login auto-approves with registry write.

### 5. Attach — the single server-writing step

Run `attach` non-interactively with the mapped flags:

```bash
agentmem projects attach --yes --json \
  --primary-domain <domain> \
  --preset <preset> \
  --priority <priority> \
  --notes "<short description>"
```

Run with `--dry-run` first if you want to inspect the plan without writes. On success stdout
is one JSON document with per-area `actions` (`registration`, `skillsLock`, `captureSkills`,
`agentsMd`, `mcpClaudeCode`, `mcpCursor`, `verification`). `attach` is idempotent — fix any
failure and re-run.

Export `AGENTMEM_MCP_API_KEY` (or pass `--mcp-key`) so the MCP client configs are written;
otherwise `attach` skips them with a warning and prints a paste-ready snippet.

### 6. Scaffold the real project (ecosystem tools)

**Do not** ask agentmem for starter templates. Delegate to the stack's normal tooling, e.g.:

| Stack | Typical command |
|-------|-----------------|
| Vite + React | `npm create vite@latest .` |
| Go module | `go mod init <module>` |
| Rust crate | `cargo init` |
| Python package | `uv init` or `hatch new` |

Run scaffolding **after** `attach` when the repo was empty, or in parallel only when it does
not conflict with `attach`'s file writes.

### 7. Record the first project memory

After `attach` succeeds and MCP is reachable, call `memory.record_event` (and optionally
`memory.propose_entry` as a draft) with:

- `project_id` from the attach output (slug `owner/repo`)
- a `project`-scoped summary: what was built, the stack chosen, and the domain/preset rationale
- structured evidence (`{ "kind": "file", "uri": "…" }`) pointing at key manifests or docs

See the `agent-memory-usage` skill for MCP tool conventions.

### 8. Hand off to the preset skill set

`attach` vendors the capture skills (`closeout`, `agent-memory-usage`) and locks the preset
from the hub. **Those preset skills now supersede this onboarding skill** — load them for
day-to-day work and invoke `@closeout` at session end.

Once `attach` completes successfully, `agentmem-onboarding` can be ignored or removed from
`.agents/skills/`.
