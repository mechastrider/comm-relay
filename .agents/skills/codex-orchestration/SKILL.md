---
name: codex-orchestration
description: >-
  Opt-in Codex-native outer loop for one substantial project change. Uses
  work-intake, fresh Sol design and review agents, Terra implementation of
  broad semantic slices, profile-specific QA, and evidence-gated OpenSpec
  closeout. Use only when the user explicitly invokes $codex-orchestration or
  names codex-orchestration.
metadata:
  short-description: Orchestrate changes with Codex Sol and Terra
---

# Codex orchestration

Run one change as an explicit Codex-native outer loop:

```text
work-intake → Sol design → broad Terra slices → profile QA
            → fresh Sol review → corrections → OpenSpec closeout
```

The parent is the orchestrator. It owns scope, decisions, worker boundaries,
acceptance, durable checklist state, STOP/continue decisions, and closeout. It
may inspect files, run checks, update checkboxes after evidence exists, and make
a tiny mechanical correction. It must not absorb a normal implementation
slice.

Read [model routing](references/model-routing.md) before starting any subagent.
Read [review](references/review.md) only when preparing the independent review.

## Activation and authority

Run only when the user explicitly invokes `$codex-orchestration`, names this
skill, or project instructions select it for the current task. Ambient requests
to start or implement work belong to
[work-intake](../work-intake/SKILL.md).

Explicit invocation authorizes one tier-appropriate in-repository cycle. For
Tier 3 this includes planning, implementation slices, QA, review, OpenSpec sync,
and archive when their normal completion contracts are satisfied. It does not
authorize publishing, deployment, push or merge-request creation, destructive
cleanup, unrelated external writes, scope expansion, or implementation across
unresolved product decisions.

At the start announce the task, Tier, process, schema/change when known, and
model policy:

- design: `gpt-5.6-sol`, `xhigh`;
- implementation and profile QA: `gpt-5.6-terra`, normally `high`;
- review: fresh `gpt-5.6-sol`, `xhigh`.

If collaboration subagents or either required model are unavailable, stop with
`BLOCKED@runtime`. Do not silently substitute a model or implement a normal
slice on the parent.

## Project and OpenSpec context

Read `AGENTS.md` / `CLAUDE.md`, the repository requirements entrypoint, and
relevant local skills before planning. Project instructions are authoritative
for trackers, roots, branches, requirements, security and compatibility
invariants, schemas, verification, delivery boundaries, notifications, and
external-write policy.

Use [work-intake](../work-intake/SKILL.md) to research the request, produce the
change brief, infer profile and affected facets, and classify Tier:

| Tier | Process |
|---|---|
| 1 | `direct` |
| 2 | `plan+implement` |
| 2.5 | `profile-design+broad-apply` |
| 3 | `profile-design+orchestrated-slices` |
| 4 | `product-foundation` |

Tier 4 stops for the project-selected product-foundation workflow. Reclassify
when work reveals a new contract, migration, deployable component, independent
milestone, or material QA risk.

Use the universal OpenSpec skills for change mechanics:

- [openspec-propose](../openspec-propose/SKILL.md) for a new planning set;
- [openspec-update-change](../openspec-update-change/SKILL.md) for revisions to
  existing artifacts;
- [openspec-apply-change](../openspec-apply-change/SKILL.md) for apply state and
  dynamic instructions;
- [openspec-sync-specs](../openspec-sync-specs/SKILL.md) and
  [openspec-archive-change](../openspec-archive-change/SKILL.md) for closeout.

Read the selected OpenSpec skill completely before using that operation. This
outer loop coordinates the operations; it does not replace their path, prompt,
state, or merge contracts.

Preserve their store-selection contract: once a registered store is selected,
keep its `--store` flag on every applicable command. Treat `openspec status
--json` and `openspec instructions ... --json` as the authority for schema,
artifact graph, paths, action context, states, and dynamic instructions. Never
infer a repo-local `openspec/changes` path, artifact name, or task file when the
CLI can resolve it.

Before the first write, snapshot `git status --short --untracked-files=all`,
staged and unstaged tracked diffs, and untracked paths. Preserve pre-existing
user changes and maintain an exact run-owned path manifest. Stop for direction
when planned work overlaps an unrelated dirty path and cannot be isolated.

## Design

Tier 1 may skip a separate design agent. For Tier 2, start a fresh Sol agent to
return a compact implementation plan and acceptance criteria without editing
application code.

For Tier 2.5 and Tier 3, start a fresh Sol agent to create or revise the
OpenSpec planning artifacts. The parent retains decision ownership. The design
agent must:

- use the schema selected by intake only when `openspec schemas --json`
  confirms it is installed; otherwise use the configured schema when suitable
  or the built-in `spec-driven` fallback for bounded work;
- scaffold a missing change with `openspec new change`; never make its directory
  by hand;
- follow the artifact dependency graph and each artifact's current
  instructions, re-reading dependencies from disk;
- use `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext` from
  CLI output rather than guessed paths;
- keep model names, worker assignments, retries, and other ephemeral
  orchestration mechanics out of durable artifacts;
- express tasks as observable behavior and meaningful milestones, not one
  checkbox per file, layer, artifact, test, fixture, or worker;
- create the schema's QA/release artifacts, using explicit `Not applicable` or
  the schema-prescribed skip when a facet does not apply;
- return material human decisions to the parent and stop when planning is
  apply-ready.

For a new change, resolve material ambiguity before scaffolding it. For an
existing change, preserve `openspec-update-change` confirmation semantics: Sol
may prepare proposed revisions, but the parent shows each revision and obtains
the required user confirmation before it is written.

The planning-only boundary of `openspec-propose` applies to the design child.
The parent may continue into apply without a second procedural confirmation
only because this outer workflow was explicitly activated.

After design, scan every required artifact for unresolved questions, `TBD`,
`BLOCKED`, or `needs human`. Stop at `BLOCKED@design` when the answer changes
observable behavior, scope, compatibility, architecture, migration, slice
boundaries, or QA. Explicit non-goals and deferrable follow-ups do not block.

## Execution map

Slice by **semantic outcome**, carrying forward the strongest lesson from the
Cursor orchestration workflow. One coherent slice may span domain, storage,
API/IPC/events, UI, tests, fixtures, and necessary call-site fallout when those
changes implement one contract and can be accepted together.

Split only at a real seam:

- independently shippable capability or milestone;
- migration or compatibility boundary that must be green before consumers
  move;
- risky verification matrix that can be rerun independently;
- deployable component with a stable temporary contract;
- scope too large to review as one coherent diff.

Combine adjacent work when separate workers would repeat the same context,
touch the same areas, or leave knowingly incomplete intermediate states. Worker
packets are ephemeral and need not mirror checkbox granularity. State the
projected slices and milestone checks before delegation, then reassess after
each accepted slice.

## Implementation

All agents share one working tree. Never run two writing agents in parallel.
Independent read-only fact gathering may run concurrently. After each writer,
compare status with the baseline and run-owned manifest. An unexpected path or
overlap with a pre-existing user change stops the run for direction.

For an OpenSpec-backed slice, refresh apply context immediately before
delegation:

1. run `openspec status --change <slug> --json` with the selected store flag;
2. run `openspec instructions apply --change <slug> --json` with the same flag;
3. stop when state is `blocked`; when `all_done`, skip implementation and
   continue with remaining gates;
4. read every concrete path under `contextFiles` from disk;
5. pass the built-in dynamic instruction, required `context`, applicable
   `operationGuidance`, relevant artifacts, project rules, and current slice
   contract to the worker.

OpenSpec owns state and paths; this orchestrator owns delegation and evidence
ordering. Workers do not edit durable task checkboxes. The parent marks only
the tasks whose specified behavior passed acceptance, then refreshes apply
instructions before the next slice. This deliberately tightens the ordinary
apply loop so delegated summaries cannot become completion evidence.

### Tier 1

Start one Terra `high` agent with narrow scope and explicit acceptance. The
parent reruns decisive checks. Use a light parent diff review only for a truly
trivial documentation or infrastructure edit; otherwise use fresh review.

### Tier 2

Start one Terra `high` agent with the accepted plan and a coherent bounded
outcome. It implements code, tests, fixtures, and necessary local fallout. The
parent reads the complete diff and independently reruns decisive acceptance.

### Tier 2.5

After apply bootstrap, start one Terra `high` agent for one broad semantic
apply unit, or a small number only when there is a real seam. Do not introduce
phases merely because the profile schema contains several artifacts.

### Tier 3

For each semantic slice, start a fresh Terra `high` agent with:

- the outcome, non-goals, invariants, and affected areas;
- relevant OpenSpec context paths and exact acceptance commands;
- permission to implement tests, fixtures, generated fallout, and small
  adjacent refactors necessary for coherence;
- a prohibition on product-decision changes, unrelated refactors, durable
  checkbox edits, and nested delegation;
- a requirement to stop at the slice boundary and report paths and evidence.

The parent reads the entire slice diff and reruns the acceptance that decides
the slice. On failure:

1. send the same Terra agent one correction task with exact failing evidence;
2. rerun acceptance;
3. only when requirements and environment are sound and stronger reasoning is
   plausibly useful, allow one fresh Sol `high` stuck-implementation pass;
4. rerun acceptance and stop at `STOPPED@implement-<slice>` if it still fails.

Do not start the next writer before the current slice is reviewed and green.

## Profile QA gate

Execute the QA artifact resolved by the schema and project, rather than
inventing scenarios after implementation. When the schema has no dedicated QA
artifact, use the brief's acceptance and project verification plan.

| Profile | Gate emphasis |
|---|---|
| library | Public examples, runtime/version matrix, source or binary compatibility, packaging dry run |
| service | Contract/integration tests, migrations and rollback, authorization, reliability and observability probes |
| web | Browser scenarios, roles/fixtures, responsive/accessibility/error states |
| desktop | Supported OS matrix, install/upgrade, filesystem/IPC/platform integration, packaged-app smoke |
| mobile | Device/OS matrix, lifecycle/background/offline, permissions/deep links, upgrade smoke |
| mixed | Per-deployable gates plus end-to-end contract checks across their boundary |

Use a fresh Terra `high` agent when QA requires a worker. Give it the plan,
fixtures, affected surfaces, evidence destination, and project adapter rather
than the entire conversation. A critical/P0 product failure blocks review. A
happy-path failure must be fixed and rerun; Partial is allowed only for clearly
recorded non-blocking tooling or matrix gaps.

Allow one bounded Terra QA-repair batch, affected acceptance commands, and one
QA rerun. Stop at `STOPPED@qa` when a critical or happy-path defect remains.

## Fresh review

Validate planning artifacts and changed delta specs before review. Do not sync
or archive merely to make the review easier; the reviewer compares the
accepted implementation with the active change artifacts and authoritative
requirements.

Read [review](references/review.md), then start a fresh Sol `xhigh` agent with
clean context and read-only instructions. Give it:

- baseline and current status plus exact run-owned tracked and untracked paths;
- complete diff/content for those paths;
- the change brief, relevant artifacts, requirements, decisions, and non-goals;
- acceptance and profile-QA evidence;
- resolved project conventions and the review contract.

Never reuse an implementer for review. Require `CRITICAL=0`, `HIGH=0`, and no
blocking evidence gap. The parent adjudicates findings, then may send one
batched, bounded repair pass to Terra. Rerun affected acceptance and QA, update
artifacts when behavior changed, and start one more fresh Sol review. Stop at
`STOPPED@review` if a blocker remains.

## Verify and close out

The parent verifies:

- every promised behavior and required task has evidence or an explicit
  schema-valid skip;
- decisive tests/builds and profile QA pass, or only recorded non-blocking gaps
  remain;
- review has `CRITICAL=0`, `HIGH=0`, and no blocking evidence gap;
- active change artifacts, requirements documentation, and implementation are
  coherent;
- OpenSpec validation and project-prescribed doctor checks pass;
- only processes and containers started by this run are stopped.

Sync delta specs and archive through the universal OpenSpec workflows. Preserve
their resolved paths, prompts, intelligent-merge verification, store flag, and
archive completion checks. If a repair changed behavior or a delta, revalidate
before sync/archive. Follow project policy for notifications, commits, merge
requests, and `closeout`; external delivery is not implicitly authorized.

Always finish with:

```text
codex-orchestration — <task-id> <title>
Status: <DONE | BLOCKED@design | BLOCKED@runtime | STOPPED@<step>>
Tier: <n> Process: <direct | plan+implement | profile-design+broad-apply | profile-design+orchestrated-slices | product-foundation>
Schema: <schema or —>
Change: <slug or —>
Models: design=sol/xhigh implement=terra/high review=sol/xhigh
Run: <slice count; retries; Sol escalations>
QA: <Pass | Partial | Fail | skipped>
Review: CRITICAL=<n> HIGH=<n> gaps=<n>
Notes: <one concise line; include QA gaps and routing deviations>
```

## Guardrails

- Opt-in only; ambient work routes through `work-intake`.
- Project instructions and explicit user choices override shared workflow
  preferences.
- No implementation with blocking product decisions.
- No parallel writers in the shared working tree.
- Every subagent has an explicit supported model, effort, bounded task, clean
  context, permissions, acceptance, and stopping condition.
- No invisible model substitution, parent implementation fallback, or nested
  delegation.
- No hard-coded product adapter, profile, deployable root, auth flow, artifact
  path, environment URL, or delivery tool.
- No completion claim from a worker summary; inspect the diff and rerun decisive
  checks.
- No publishing, deployment, push, MR creation, or destructive cleanup without
  the corresponding authority.
