# Task packet contract

Every delegated coding slice uses a **repository-local Markdown task packet**. The
orchestrator writes the full task; the executor receives only a one-line pointer.

## Default location (ephemeral packets)

Create one-off delegation packets under:

```
.agent-orchestration/tasks/<slice>.md
```

These files are **temporary orchestration scratch space** — not product artifacts
and **not intended for version control**. Add `.agent-orchestration/` to
`.gitignore` in consuming projects (this repository already does).

**Not the same as durable planning.** OpenSpec changes, project specs, ADRs, and
other native planning artifacts belong in the project's established planning
system. When delegating a bounded slice, distill the relevant contract into a task
packet; do not replace or duplicate durable specs with ephemeral packets.

The executor accepts **any** repository-local path. The default directory is
recommended for orchestrators, not enforced by the CLI.

## Fixed sections

Use these headings in order:

```markdown
# <Slice name>

## Goal
1–2 sentences: the outcome, not the steps.

## Repo context
- Point at AGENTS.md and any skill(s) to read.
- Name exact files/functions and their current behavior.
- State what prior slices already landed.

## Acceptance criteria
Numbered, testable, specific.

## Files / areas to touch
Explicit list — bounds blast radius.

## How to verify
Exact commands that must pass (copy-pasteable).

## Guardrails
- What NOT to touch; invariants to preserve.
- One slice only; no unrelated refactors.

## Return format
What the executor must return (summary, changed files, check results).
```

## Delegation prompt

Send exactly one pointer sentence — never embed the packet in CLI argv:

```
Read <path-to-packet> fully and execute it exactly
```

## Orchestrator responsibilities

- Write the packet before delegating.
- Keep acceptance criteria, file bounds, and verify commands specific.
- After the executor finishes, **read the diff yourself** and **run verify commands
  yourself** — the executor summary is a claim, not proof.
