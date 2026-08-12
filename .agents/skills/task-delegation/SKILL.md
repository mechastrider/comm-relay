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

1. **Plan** — explore, decide the change, route by tier, and create an execution
   map of semantic milestones, projected primary slices, and broad verification
   boundaries. OpenSpec/checklist items are inputs to this map, not slice boundaries.
2. **Packet** — write the full slice into a task file ([format](references/task-packet.md)).
3. **Delegate** — one-line pointer only; use the project-local executor ([hosts](references/host-adapters.md)).
4. **Review** — read the whole slice diff and focused evidence before sending any
   correction. Collect related findings into one review packet.
5. **Iterate** — resume once with the related review findings; use another narrow
   resume only when verification reveals new evidence. Start fresh when the topic changed.
6. **Checkpoint** — commit or otherwise establish a reviewed green boundary before
   the dirty tree spans the next independent milestone. For long changes, continue
   from durable repo artifacts in a fresh parent session instead of keeping the
   entire change in one conversation.

## Managed skills

Before editing a path under `.agents/skills/`, determine its provenance from the
repository instructions, `NOTICE`, and hub catalog. Presence in
`skills.lock.yaml` `selected_paths` means the skill is installed; it does not by
itself prove that the local copy is hub-owned and editable.

- If the skill is generated or vendored from an upstream tool/repository, do not
  edit or push the installed copy. Change the upstream source/generator, or put
  project policy in a non-vendored overlay skill that will survive the next sync.
- If the skill is hub-owned and managed, use this workflow:

1. Edit locally for iteration.
2. Run `agentmem skills verify` — offline check against `upstream_hash`.
3. On verify failure after intentional edits: **`agentmem skills push`** (opens hub PR).
4. After hub merge: **`agentmem skills pull`** in consumer repos.
5. **Never** hand-edit `upstream_hash` or `hub.commit` in the lock file.

For hub-owned skills, `skills push` compares local content to hub HEAD, not lock hashes — stale
`upstream_hash` after a local edit is expected until pull.

## Slicing (highest-leverage decision)

- **Cut vertically by meaning**, not horizontally by layer.
- **Do not map planning checkboxes one-to-one to executor jobs.** Group adjacent
  checklist items when they implement one contract and can be accepted together;
  one slice may satisfy several tasks, and one matrix-heavy task may require several slices.
- **Green-at-every-commit** — if a slice cannot be green alone, merge seams.
- **Include fallout** — contract changes carry call-site and fixture updates in the same slice.
- **Target** one independently reviewable outcome, ≤5 acceptance bullets,
  roughly 5–10 files, and ≤2 layers once the semantic seam is right.
- **Combine undersized primary slices** when they merely pass the same contract
  across adjacent files/layers, repeat most of the same packet context, and the
  combined result can still be reviewed and verified as one green unit.
- **Split oversized matrices** when routes, themes, viewports, failure modes, or
  other axes can fail and rerun independently. A cross-product test matrix is not
  one slice merely because it lives in one test file.
- **Keep review corrections narrow**. A tiny `resume` that fixes one evidence-backed
  finding is healthy, but finish reviewing the primary diff first and batch related
  findings into one resume. Do not combine unrelated findings just to make the job larger.

Before the first delegation, estimate the number of primary slices. When the map
exceeds roughly 12 primary slices or spans more than two independently verifiable
milestones, split the work into milestone sessions. Prefer separate PRs when the
milestones are independently shippable; otherwise keep one branch/PR but start a
fresh parent session from durable artifacts at each green milestone.

Reassess the map after each milestone or about six primary jobs. The following are
anti-fragmentation signals, not quotas:

- more review/fix jobs than accepted primary jobs;
- repeated primary jobs finishing in 1–2 minutes;
- adjacent packets repeating most context, files, and verification commands;
- packet/review/verification overhead taking longer than executor implementation.

When these signals appear, stop creating packets mechanically. Merge the next
adjacent slices, batch the current review findings, and move broad verification to
the milestone boundary.

Use elapsed time only as retrospective evidence, not as the primary boundary:
repeated 1–2 minute primary jobs suggest over-fragmentation; jobs approaching
20–30 minutes, timing out, or needing several independent verification phases
suggest an oversized slice.

## Verification budget

- Put focused checks that prove the slice in the executor packet.
- Run broad repository suites at green milestones and final verification, not in
  every small packet, unless the slice changes the build/test harness itself.
- The orchestrator independently reruns the focused checks and owns acceptance.
- Avoid running the same broad suite in both executor and orchestrator for every
  slice. Let the executor prove the slice narrowly; let the orchestrator own broad
  milestone and final suites.
- Executors report evidence; the orchestrator updates OpenSpec checkboxes,
  verification ledgers, and other process artifacts.

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
- Treating every OpenSpec/checklist item as a separate executor job.
- Repeated micro-slices whose packet/review overhead exceeds their implementation.
- Sending one correction at a time before completing review of the primary diff.
- Running broad repository suites in every executor packet and then repeating them
  immediately in the orchestrator.
- One E2E job spanning an independently rerunnable cross-product matrix.
- Carrying dozens of accepted slices in one uncheckpointed dirty tree or parent session.
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
