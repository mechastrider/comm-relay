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
Numbered, testable, specific; no more than five. State the important cross-layer
and async invariants up front rather than discovering them only during review.
When the slice fulfills planning/checklist items, name all of them here; do not
create a separate packet merely because they have separate checkbox numbers.

## Files / areas to touch
Explicit list — bounds blast radius.

## How to verify
Exact focused commands that prove this slice (copy-pasteable). Reserve broad
repository suites for orchestrator-owned milestone/final verification unless the
slice changes the test or build harness.

## Guardrails
- What NOT to touch; invariants to preserve.
- One slice only; no unrelated refactors.
- Do not edit OpenSpec checkboxes, verification ledgers, or other orchestrator-owned
  process artifacts; report evidence for the orchestrator to record.

## Return format
What the executor must return (summary, changed files, check results).
```

## Delegation prompt

Send exactly one pointer sentence — never embed the packet in CLI argv:

```
Read <path-to-packet> fully and execute it exactly
```

## Orchestrator responsibilities

- Create an execution map of semantic milestones and projected primary slices
  before writing the first packet. Treat planning tasks as coverage requirements,
  not mandatory job boundaries.
- Write the packet before delegating.
- Keep acceptance criteria, file bounds, and verify commands specific.
- Combine adjacent micro-slices when they carry one contract and remain green;
  split cross-product matrices into independently rerunnable packets.
- After the executor finishes, **read the diff yourself** and **run verify commands
  yourself** — the executor summary is a claim, not proof.
- Finish reviewing the whole slice before delegating corrections. Put related
  findings into one resume packet and reserve additional resumes for newly revealed evidence.
- Checkpoint accepted milestones so later jobs do not inherit an ever-growing dirty
  baseline, and move long changes to a fresh parent session using durable repo artifacts.
