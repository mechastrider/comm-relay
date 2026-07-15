---
name: task-delegation
description: Host-neutral orchestration policy for coding work — parent models resolve uncertainty, slice along semantic seams, write task packets, and independently review/verify; Composer 2.5 is the only Cursor CLI code writer. Use when delegating bounded coding slices from Codex, Claude Code, or any orchestrator-executor workflow.
---

# Task Delegation

Run coding work as an **orchestrator-executor loop**. The **orchestrator** (parent
model) explores, plans, slices, routes, and **reviews**. Executors write code.
The orchestrator does not hand-write product code beyond trivial fixes.

> Executors have **no conversation context**. Every delegation must be
> self-contained via a task packet.

## Roles

| Role | Owner | Responsibility |
|---|---|---|
| **Orchestrator** | Parent model (any host) | Uncertainty reduction, slicing, routing, diff review, verify runs, acceptance |
| **Cursor CLI executor** | `cursor-agent` via vendored script | All non-trivial coding slices after decomposition |
| **Opus / strong parent** | Dedicated high-reasoning agent | Research, design, decomposition, review — **not** product coding |
| **Inline** | Orchestrator | Truly trivial mechanical edits where a round-trip would only slow down |

Never delegate **review** or **routing decisions**. Never let a review command
apply its own findings.

## Routing

| Work type | Examples | Executor |
|---|---|---|
| **Uncertainty / research / design / decompose / review** | thorny spec, architecture choices, deep research, acceptance review | **Opus or strong parent model** |
| **Non-trivial coding** | scoped features, refactors, tests, migrations, multi-file fixes | **Cursor CLI** (`composer-2.5` only) |
| **Trivial / mechanical** | typo, one-line rename, obvious import fix | **orchestrator, inline** |

**Composer 2.5 is the only CLI code-writing model.** No `-fast` variant, no auto
selection, no Opus coding route, no escalation on failure — sharpen the task
packet and re-delegate.

If the executor, `cursor-agent`, or authentication is unavailable, **stop and
report explicitly** — do not silently fall back to another executor or write the
code yourself.

## The loop

1. **Plan** — explore, decide the change, route by tier, slice (see below).
2. **Packet** — write the full slice into a task file ([format](references/task-packet.md)).
3. **Delegate** — one-line pointer only; use the project-local executor ([hosts](references/host-adapters.md)).
4. **Review** — read the diff yourself; run verify commands yourself.
5. **Iterate** — resume for tight follow-ups; fresh packet when the topic changed.
6. **Commit** — green slice only; orchestrator owns commits unless the packet says otherwise.

## Managed skills

When a slice touches paths under `.agents/skills/` that appear in
`skills.lock.yaml` `selected_paths`, treat them as **hub-managed**:

1. Edit locally for iteration.
2. Run `agentmem skills verify` — offline check against `upstream_hash`.
3. On verify failure after intentional edits: **`agentmem skills push`** (opens hub PR).
4. After hub merge: **`agentmem skills pull`** in consumer repos.
5. **Never** hand-edit `upstream_hash` or `hub.commit` in the lock file.

`skills push` compares local content to hub HEAD, not lock hashes — stale
`upstream_hash` after a local edit is expected until pull.

## Slicing (highest-leverage decision)

- **Cut vertically by meaning**, not horizontally by layer.
- **Green-at-every-commit** — if a slice cannot be green alone, merge seams.
- **Include fallout** — contract changes carry call-site and fixture updates in the same slice.
- **Size** (once the seam is right): ≤5 acceptance bullets, roughly ≤10 files, ≤2 layers.

## Task packet

The packet is the portable execution contract. Fixed sections, pointer-only
delegation, orchestrator-owned review — see
[references/task-packet.md](references/task-packet.md).

### Ephemeral default location

One-off delegation slices belong in **`.agent-orchestration/tasks/<slice>.md`**
by default. These packets are orchestration scratch space — not product artifacts
and not intended for version control. Consuming projects ignore
`.agent-orchestration/` (for example via `.gitignore` and `agentmem attach`).

**Durable planning** — OpenSpec changes, ADRs, design docs, and other
project-native artifacts — stay in the project's established planning system.
Write a temporary executor packet when delegating a bounded slice; do not
collapse durable specs into ephemeral packets.

The executor accepts any repository-local path; the default directory is an
orchestrator convention, not a CLI restriction.

## Host adapters

Codex, Claude Code, and Cursor each invoke or bypass the CLI executor per host
boundaries — see [references/host-adapters.md](references/host-adapters.md).

## Reliability

Durable jobs, per-repo locking, timeout/cancel/resume, Git path snapshots,
redacted logs, and stream-json tolerance — see
[references/reliability.md](references/reliability.md).

## Anti-patterns

- Horizontal slicing of a vertical change.
- Fencing out mechanical fallout into a follow-up slice.
- Trusting the executor summary without diff + verify.
- Escalating the model on failure.
- Routing non-trivial coding to Opus or inline.
- Silent fallback when Cursor is unavailable.
- Delegating design or review.

## Per-project configuration

Read volatile mechanics from the consuming project's **AGENTS.md**: verify
commands, Cursor auth recipe, and slash-command wrappers. This skill owns
**policy and routing**; AGENTS.md owns **project mechanics**.
