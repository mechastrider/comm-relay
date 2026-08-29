---
name: task-delegation
description: Host-neutral delegation policy for coding work — strong parents hand broad semantic outcomes to Cursor Composer 2.5 through Herdr or the durable script executor, then inspect the diff and verify independently. Use from Codex, Claude Code, Cursor, or an outer orchestrator such as change-orchestration.
---

# Task Delegation

Run coding work as an **orchestrator-executor loop**. The parent explores,
plans, chooses broad semantic seams, routes, reviews, and accepts. Cursor
Composer 2.5 writes code. The parent does not hand-write non-trivial product code.

> Executors have **no conversation context**. Every delegation must be
> self-contained via a task packet.

## Roles

| Role | Owner | Responsibility |
|---|---|---|
| **Orchestrator** | Parent model (any host) | Uncertainty reduction, slicing, routing, diff review, verify runs, acceptance |
| **Cursor worker** | Composer 2.5 through Herdr, Cursor-native worker, or vendored script | All non-trivial coding slices after decomposition |
| **Opus / strong parent** | Dedicated high-reasoning agent | Research, design, decomposition, review — **not** product coding |
| **Inline** | Orchestrator | Truly trivial mechanical edits where a round-trip would only slow down |

Never let the implementation worker review or accept its own work. An outer
orchestrator may ask a **fresh strong reviewer** for a read-only defect pass;
the parent still adjudicates findings and owns routing and acceptance. Never let
a review command apply its own findings.

## Routing

| Work type | Examples | Executor |
|---|---|---|
| **Uncertainty / research / design / decompose / review** | thorny spec, architecture choices, deep research, acceptance review | **Opus or strong parent model** |
| **Non-trivial coding** | scoped features, refactors, tests, migrations, multi-file fixes | **Cursor Composer 2.5** through an approved transport |
| **Trivial / mechanical** | typo, one-line rename, obvious import fix | **orchestrator, inline** |

**Composer 2.5 is the only delegated code-writing model.** No `-fast` variant,
no auto selection, no strong-parent coding route, and no model escalation on
failure. Improve the packet, reduce uncertainty, or stop with evidence.

Use the transport selected by the outer workflow. `change-orchestration`
prefers Herdr when explicitly invoked inside a healthy Herdr session and uses
the script executor as fallback/recovery. If neither can provide Composer 2.5,
**stop and report explicitly**; do not switch models or write the code yourself.

## The loop

1. **Plan** — explore, decide the change, route by tier, and create an execution
   map of semantic milestones, projected primary slices, and broad verification
   boundaries. OpenSpec/checklist items are inputs to this map, not slice boundaries.
2. **Packet** — write the full slice into a task file ([format](references/task-packet.md)).
3. **Delegate** — one-line pointer only; use the selected Herdr/native/script
   adapter ([hosts](references/host-adapters.md)).
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
- **Prefer a whole coherent outcome.** A slice may span domain, persistence,
  API/IPC, UI, tests, fixtures, and call-site fallout when they implement one
  contract and can be accepted together. File count and layer count are warning
  signals, not primary boundaries.
- For an ordinary feature, aim for one broad slice or a few meaningful slices.
  Do not pre-split work merely to keep a packet small or a worker busy.
- Give the worker freedom inside named areas: choose exact files, follow local
  patterns, add required tests/fixtures, and make small adjacent refactors that
  keep the outcome coherent. Product decisions and unrelated improvements stay
  outside the packet.
- **Combine undersized primary slices** when they merely pass the same contract
  across adjacent files/layers, repeat most of the same packet context, and the
  combined result can still be reviewed and verified as one green unit.
- **Split oversized matrices** when routes, themes, viewports, failure modes, or
  other axes can fail and rerun independently. A cross-product test matrix is not
  one slice merely because it lives in one test file.
- **Keep review corrections narrow**. A tiny `resume` that fixes one evidence-backed
  finding is healthy, but finish reviewing the primary diff first and batch related
  findings into one resume. Do not combine unrelated findings just to make the job larger.

Before the first delegation, estimate the primary slices and challenge every
boundary. If an ordinary feature produces many jobs, assume over-fragmentation
until a real compatibility, deployment, risk, or independently shippable seam
proves otherwise. Split long work into milestone sessions when the milestones
have independent acceptance; otherwise preserve the end-to-end contract in one
slice and checkpoint after it is green.

Reassess after each accepted slice. The following are anti-fragmentation
signals, not quotas:

- more review/fix jobs than accepted primary jobs;
- repeated primary jobs finishing in 1–2 minutes;
- adjacent packets repeating most context, files, and verification commands;
- packet/review/verification overhead taking longer than executor implementation.

When these signals appear, stop creating packets mechanically. Merge the next
adjacent slices, batch the current review findings, and move broad verification to
the milestone boundary.

Use elapsed time only as retrospective evidence. Repeated very short jobs
usually indicate micro-slicing. A long job is not automatically oversized when
it still represents one contract; timeouts, an unreadable diff, or several
independent verification phases are stronger split signals.

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

Codex, Claude Code, and Cursor use Herdr, native workers, or the script executor
according to the outer workflow and host boundaries — see
[references/host-adapters.md](references/host-adapters.md).

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
- One QA job spanning an independently rerunnable cross-product matrix.
- Carrying dozens of accepted slices in one uncheckpointed dirty tree or parent session.
- Fencing out mechanical fallout into a follow-up slice.
- Trusting the executor summary without diff + verify.
- Escalating the model on failure.
- Routing non-trivial coding to Opus or inline.
- Running Herdr and the script executor as concurrent writers.
- Replaying the original packet after a partial Herdr run without inspecting
  the current diff and writing a remaining-work packet.
- Silent model fallback when Cursor/Composer is unavailable.
- Delegating design to the code writer or letting that writer self-review.

## Per-project configuration

Read volatile mechanics from the consuming project's **AGENTS.md**: verify
commands, Cursor auth recipe, and slash-command wrappers. This skill owns
**policy and routing**; AGENTS.md owns **project mechanics**.
