---
name: change-orchestration
description: >-
  Opt-in outer loop for one substantial change with a Codex or Claude parent
  and Cursor Composer workers. Repeats the Cursor orchestration cycle:
  research-first intake, parent-owned OpenSpec design, broad semantic
  implementation slices, profile QA, fresh independent review, and closeout.
  Uses Herdr first when running inside Herdr and the workflow is explicitly
  invoked; falls back to the task-delegation Cursor executor when Herdr is
  unavailable or loses control.
---

# Change orchestration

Outer loop for **one change** when a strong Codex or Claude parent coordinates
Cursor workers. This workflow mirrors Cursor-native orchestration while keeping
host mechanics separate:

```text
work-intake → parent design → broad Composer slices → profile QA
            → fresh review → corrections → verify → closeout
```

Use only when the user names **change-orchestration**, explicitly asks for the
Codex/Claude + Cursor workflow, or project instructions select it for the
current task. Ambient task language belongs to **work-intake**.

An explicit invocation authorizes the normal in-repository planning,
delegation, test, and review actions of this workflow. It does not authorize
publishing, deployment, store submission, destructive cleanup, or other
external mutations not already requested.

## Responsibilities

| Stage | Owner |
|-------|-------|
| Intake and uncertainty reduction | Parent; **work-intake** |
| OpenSpec planning and decisions | Parent; workers may gather facts only |
| Implementation | Cursor Composer 2.5 through **task-delegation** |
| Focused acceptance | Worker runs packet checks; parent reruns decisive checks |
| Profile QA | Cursor worker or project tool using `qa_plan.md`; parent owns verdict |
| Review | Fresh strong reviewer; never the implementation worker |
| Corrections | Composer receives one batched correction packet |
| Final verification and closeout | Parent |

The parent owns scope, decisions, task boundaries, acceptance, STOP/continue,
and all durable OpenSpec/checklist updates. Workers may edit code and tests; they
do not redefine the change.

## Step 0 — Context and intake

1. Read `AGENTS.md` / `CLAUDE.md` and relevant local skills.
2. Run **work-intake**: investigate before asking, produce the change brief,
   infer profile/facets, and classify Tier.
3. Announce task/title, Tier, process, OpenSpec schema, parent, worker model, and
   selected delegation transport.

| Tier | Process |
|------|---------|
| 1 | `direct-or-single-worker` |
| 2 | `plan+single-semantic-slice` |
| 2.5 | `profile-design+broad-apply` |
| 3 | `profile-design+orchestrated-slices` |
| 4 | `product-foundation` |

Tier 4 stops for product foundation. An explicit `change-orchestration`
invocation confirms the full Tier 3 cycle; do not ask for a second procedural
confirmation. Stop only for unresolved material decisions or new authority.

## Step 0.5 — Select and validate transport

Read [references/transports.md](references/transports.md) and
**task-delegation** before the first worker.

Transport order:

1. **Herdr**, when this explicitly invoked workflow is running with
   `HERDR_ENV=1` and Herdr can identify the current pane/session.
2. **Cursor executor scripts**, after `doctor`, when Herdr is unavailable,
   cannot start/control the requested Cursor worker, or loses reliable
   interaction.

Do not oscillate transports. Select one initially. Switch from Herdr to scripts
only after applying the recovery procedure and turning the observed diff into a
new remaining-work packet. Never run both as concurrent writers in one repo.

If neither transport can provide a Composer 2.5 writer, stop and report. The
parent does not silently absorb non-trivial product coding.

## Step 1 — Design

Tier 1 may skip durable planning. For Tier ≥ 2:

1. Select `spec-driven` for bounded work or the profile schema recommended by
   work-intake (`library-change`, `service-change`, `web-change`,
   `desktop-change`, or `mobile-change`).
2. The **parent** creates or updates proposal, specs, design, contracts,
   `qa_plan.md`, and `tasks.md` using the installed OpenSpec workflow.
3. Cursor workers may gather repository facts, reproduce behavior, or compare
   alternatives. They must not author the complete design pass.
4. Make tasks represent behavior/coverage and durable milestones. Do not map
   every checkbox, artifact, file, or architectural layer to a worker job.
5. Run the blocking-question gate.

### Blocking-question gate

Do not implement while a required artifact contains an unresolved question,
`TBD`, `BLOCKED`, or `needs human` whose answer changes observable behavior,
compatibility, architecture, migration, task boundaries, or QA. Deferrable
follow-ups and explicit non-goals do not block.

## Step 2 — Build the execution map

Slice by **semantic outcome**, not by layer. A normal feature should usually be
one broad primary slice or a few meaningful slices, not a queue of micro-jobs.

A healthy Composer slice may span domain, storage, API/IPC, UI, tests, fixtures,
and call-site fallout when those changes implement one contract and can be
accepted together. Give the worker freedom to choose exact files and local
implementation details inside named areas and project conventions.

Split only at a real seam:

- independently shippable capability or milestone;
- migration/compatibility boundary that must be green before consumers move;
- risky matrix that can be verified and rerun independently;
- deployable component with a stable temporary contract;
- scope too large to review as one coherent diff.

Combine work when adjacent jobs would repeat the same context, touch the same
areas, or leave intermediate commits knowingly incomplete. Do not create
separate “implementation,” “tests,” “fixtures,” or “call-site updates” jobs for
one behavior.

Before delegation, state the projected primary slices and milestone checks.
Reassess after each accepted slice; reclassify if a new independent milestone
appears.

## Step 3 — Implement broad slices

For each semantic slice:

1. Write a self-contained task packet using **task-delegation**. Use areas and
   invariants rather than an exhaustive file allow-list. Include all relevant
   OpenSpec artifacts by path.
2. Delegate through the selected transport to Composer 2.5.
3. Let the worker implement the whole outcome, including tests, fixtures,
   generated fallout, and small adjacent refactors required to keep the result
   coherent. It may not add unrelated features or change product decisions.
4. Read the entire diff and focused evidence after return.
5. Run the acceptance commands that decide the slice, not every broad suite
   twice.
6. Review the whole slice before sending corrections. Batch related findings
   into one correction packet.
7. Establish a reviewed green checkpoint before the next independent
   milestone.

One correction pass is the norm. A second is justified only by new evidence
from verification, not by sending review comments one at a time. Persistent
acceptance failure stops at `STOPPED@implement-<slice>` with evidence.

## Step 4 — Profile QA gate

Execute `qa_plan.md`; do not invent scenarios after implementation.

| Profile | Gate emphasis |
|---------|---------------|
| library | Public examples, supported runtime/version matrix, source/binary compatibility, packaging dry run |
| service | Contract/integration tests, migration/rollback, authorization, reliability/observability probes |
| web | Browser scenarios, roles/fixtures, responsive/accessibility/error states; P0 blocks review |
| desktop | Supported OS matrix, install/upgrade, filesystem/IPC/platform integration, packaged-app smoke |
| mobile | Device/OS matrix, lifecycle/background/offline, permissions/deep links, upgrade smoke |

Record Pass/Partial/Fail and evidence at the project/profile location. A
critical/P0 failure blocks review. Partial happy-path coverage must list the
exact gap in final Notes. Do not publish or deploy merely because a release QA
step exists.

## Step 5 — Fresh review

Read [references/review.md](references/review.md).

Use a fresh strong reviewer with clean context:

1. Prefer a separate Codex/Claude reviewer agent through healthy Herdr when
   available.
2. Otherwise use the host's fresh-agent/subagent mechanism when project policy
   permits it.
3. If neither exists, the parent performs the review only after re-reading the
   change artifacts and diff from disk; record that independent context was
   unavailable.

The reviewer receives the base diff, change artifacts, scope/non-goals, QA
evidence, and project rules. It does not edit code. The parent adjudicates the
findings and owns acceptance.

CRITICAL=0 is required. Send accepted CRITICAL/IMPORTANT corrections to
Composer as one bounded packet, then rerun affected checks. Do not resume the
original implementer for the review itself; a correction may resume only when
the same worker/session remains healthy and the findings concern the same
semantic slice.

## Step 6 — Verify and close out

1. Run the project's final verification and `openspec validate` where relevant.
2. Confirm every promised behavior is implemented; no acceptance criterion was
   silently narrowed or deferred.
3. Mark durable task/checklist state only from observed evidence.
4. Sync/archive OpenSpec and create a commit/MR only when requested or required
   by project instructions and already authorized.
5. Run **closeout**.

Always finish with:

```text
change-orchestration — <task-id> <title>
Status: <DONE | BLOCKED@design | STOPPED@<step>>
Tier: <n> Process: <process>
Parent: <Codex | Claude>
Worker: Cursor Composer 2.5
Transport: <Herdr | cursor-executor | mixed-after-recovery>
Schema: <schema or —>
Change: <slug or —>
Review: <fresh agent | parent fallback>; CRITICAL=<n>
QA: <Pass | Partial | Fail | skipped>
Notes: <one concise line>
```

## Guardrails

- Opt-in only; ambient task language routes through work-intake.
- Parent owns research, design, routing, acceptance, and closeout.
- Composer gets broad semantic outcomes, not layer/checklist micro-jobs.
- Never let the implementation worker review or accept its own diff.
- Never start implementation with blocking decisions.
- Never infer completion from an agent summary or an inaccessible Herdr pane;
  inspect diff and rerun decisive checks.
- Never run Herdr and cursor-executor as concurrent writers.
- Never silently substitute another code-writing model or inline parent coding
  when Composer transport is unavailable.
- Never publish, deploy, submit to a store, or perform destructive cleanup
  without the corresponding user authority.
