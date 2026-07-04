---
name: agent-memory-usage
description: How coding agents should use agentmem MCP in client repositories. Use before tasks in registered GitHub/GitLab projects.
---

# Agent memory usage (client repos)

Install this skill in project repos that connect to agentmem MCP.

## When to call tools

| Phase | Tool |
|-------|------|
| Task start | `memory.get_context_pack` with `project_id` (e.g. `owner/repo`) or `repo_url` |
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

## Rules

- Never request `active` via `propose_entry` — server ignores it
- Prefer summaries + structured evidence (`{ "kind", "uri" }`) over pasting file paths into memory bodies
- Use `memory.record_feedback` when retrieved memory is wrong or outdated
- When proposing a multi-file skill via `memory.create_skill_proposal`/`update_skill_proposal`, keep `SKILL.md` in `proposed_text` and pass supplementary files (`references/`, `scripts/`, `assets/`) in `proposed_files` as `{ path, content, encoding }` (`encoding`: `utf8` or `base64`); paths must be relative and not `SKILL.md`
