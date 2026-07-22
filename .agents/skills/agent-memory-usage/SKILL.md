---
name: agent-memory-usage
description: How coding agents should use agentmem MCP in client repositories. Use before tasks in registered GitHub/GitLab projects.
---

# Agent memory usage (client repos)

Install this skill in project repos that connect to agentmem MCP.

## When to call tools

| Phase | Tool |
|-------|------|
| Task start | `memory.get_context_pack` with `project_id` (e.g. `muonsoft/agentmem`) or `repo_url` |
| Stuck / need precedent | `memory.search` with filters |
| After review feedback | `memory.record_event` |
| Stable lesson, not yet a rule | `memory.propose_entry` as **draft** |

## Modes for `get_context_pack`

`design`, `implement`, `verify`, `review`, `skill-authoring`, `debug`

## Session closeout

At session end, invoke `@closeout` in repos that ship the `closeout` skill (including `agentmem` itself).
The agent reads the transcript, retrospects, and records events via MCP.

Review whether the user confirmed a reusable success — not every passing command deserves memory.

| Situation | Action |
|-----------|--------|
| User explicitly chose or confirmed a design, workflow, or pattern | `memory.record_event` with a canonical positive type |
| The lesson is reusable and should become draft memory | Also `memory.propose_entry` with structured evidence |
| Routine command succeeded with no decision or reusable lesson | Do **not** record a positive event |

Canonical positive event types:

- `positive_outcome` — general confirmed success worth preserving as evidence
- `decision_confirmed` — user explicitly chose an option or direction
- `workflow_validated` — reusable command/check sequence was verified
- `pattern_validated` — reusable implementation or review pattern was verified

`decision_made` is **not** a positive outcome type. Use it when recording that a decision happened; use `decision_confirmed` when the user explicitly approved the chosen outcome.

### Examples

**Record event + propose draft** — user selects favicon direction A, you implement it, and they confirm it looks right:

```json
{
  "event_type": "decision_confirmed",
  "summary": "User selected favicon direction A for the public site",
  "details": { "selectedOption": "A", "verifiedIn": "browser" },
  "memory_type_hint": "decision",
  "evidence": [{ "kind": "file", "uri": "web/public/favicon.svg" }]
}
```

Then propose draft memory with actionable wording (selected direction, where implemented, why it helps future agents) and the same structured evidence — not generic praise.

**Record event only** — user confirms a validated release workflow that is not yet ready for active memory:

```json
{
  "event_type": "workflow_validated",
  "summary": "Release checklist passed for v1.2",
  "details": { "commands": ["task test", "task web:build"] }
}
```

**Do not record** — `npm test` passed on a routine fix with no new decision, workflow lesson, or reusable pattern.

`memory.record_event` does not warn about low-value positive events. Apply the closeout criteria yourself; curators can decline promotion later.

## Structured payloads

Supported memory types accept optional `structured_payload` alongside required prose.
`title` / `body` / `summary` remain required. Empty `{}` is treated as no payload.

**Source of truth:** call `memory.get_schema` before inventing fields or areas — the live
server may be newer than this skill. The cheat sheet below matches the current soft schema
and is enough for routine proposes without guessing keys.

### Soft-schema cheat sheet

Unknown top-level keys are rejected. All listed fields are optional; omit rather than invent.

| Memory type | Role | Allowed keys | Notes |
|-------------|------|--------------|-------|
| `coding` | MVP | `area` (string enum), `rule` (string), `examples` (string[]) | Prefer both `area` + `rule` for dedupe |
| `workflow` | MVP | `when` (string), `steps` (string[]), `pitfalls` (string[]), `related_files` (string[]) | Prefer `when` (+ `steps` when useful) |
| `decision` | stub | `chosen` (string), `rejected` (string[]), `constraints` (string[]), `supersedes` (uuid) | Prose primary until stubs stabilize |
| `review_pattern` | stub | `fingerprint`, `symptom`, `root_cause`, `fix`, `prevention` (strings), `related_files` (string[]) | Same |

**`coding.area` closed enum** (do not invent values such as `android`, `rust`, `kubernetes`):

`go` · `tests` · `database` · `api` · `logging` · `errors` · `security` · `frontend` · `docs` · `auth` · `ci` · `github` · `skills` · `mcp` · `observability` · `tasks`

If no enum value fits, omit `area` and set `rule` only — or skip the payload and keep prose.

**Rejected / prose-only**

- Do **not** use `memory_type` `testing` — use `coding` with `area: "tests"` (keep tag `testing` if useful).
- `architecture`, `product`, `tech_debt`, `skill_candidate` (and undeclared types like `ux-ui`) reject non-empty payloads — prose only.

### Coding payload example

```json
{
  "memory_type": "coding",
  "title": "Export PATH before task commands",
  "summary": "Taskfile targets need ~/go/bin on PATH.",
  "body": "In this repo, go-task is installed to ~/go/bin. Export PATH before running task targets in a fresh shell.",
  "structured_payload": {
    "area": "ci",
    "rule": "Export PATH=\"$HOME/go/bin:$PATH\" before running task commands in a fresh shell.",
    "examples": ["export PATH=\"$HOME/go/bin:$PATH\"", "task test"]
  },
  "tags": ["devtool"],
  "suggested_status": "draft"
}
```

### Workflow payload example

```json
{
  "memory_type": "workflow",
  "title": "Verify entry detail after API shape changes",
  "summary": "Spot-check the admin entry detail page when entry JSON fields change.",
  "body": "After changing memory entry API fields, load an entry with evidence and versions in the admin UI.",
  "structured_payload": {
    "when": "After adding or renaming fields on memory entry API responses",
    "steps": [
      "Run task web:build",
      "Open /memory/entries and drill into an entry with versions",
      "Confirm metadata, evidence, and any new payload sections render"
    ],
    "related_files": ["web/src/pages/EntryDetailPage.tsx", "web/src/services/types.ts"]
  },
  "suggested_status": "draft"
}
```

`memory.propose_entry` returns explicit write-result fields (`operation`: `insert` | `update` | `noop` | `conflict`). Identity-key dedupe updates an existing draft/candidate/active row instead of creating duplicates.

For `decision` / `review_pattern`, prose remains primary until stub schemas stabilize — add minimal payload only when it aids dedupe.

## Rules

- Never request `active` via `propose_entry` — server ignores it
- Prefer summaries + structured evidence (`{ "kind", "uri" }`) over pasting file paths into memory bodies
- Use `memory.record_feedback` when retrieved memory is wrong or outdated
- When proposing a multi-file skill via `memory.create_skill_proposal`/`update_skill_proposal`, keep `SKILL.md` in `proposed_text` and pass supplementary files (`references/`, `scripts/`, `assets/`) in `proposed_files` as `{ path, content, encoding }` (`encoding`: `utf8` or `base64`); paths must be relative and not `SKILL.md`
