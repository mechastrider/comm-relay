---
name: cursor-orchestration
description: >-
  Opt-in Cursor orchestrator for one fullstack web task. Use ONLY when the user
  asks for cursor-orchestration or /cursor-orchestration. Parent Grok 4.6
  designs; Composer implements typed slices; browser runs before a fresh Grok
  review.
disable-model-invocation: true
---

# Cursor orchestration

Outer loop for **one task** on Cursor in a fullstack web application. Classify
via **work-intake**, design on **parent Grok 4.6**, implement with Composer on
**typed slices** from `tasks.md`, run the browser plan from `qa_plan.md`, then a
**fresh Grok review Task**, then closeout.

The project's universal OpenSpec skills live under `.agents/skills/openspec-*`.
Use those skills for planning, change context, validation, sync, and archive.
This workflow adds only Cursor-specific orchestration; it does not require
provider-specific OpenSpec skills, slash commands, or implementation overlays.

Project `AGENTS.md` wins on tracker, branches, schemas, verification, and MR
tooling.

## Activation gate (mandatory)

Run **only** when the user names `cursor-orchestration` or
`/cursor-orchestration`. Ambient “start the task” language belongs to
**work-intake**.

Announce at start: Tier/Process, parent Grok 4.6, worker Composer 2.5.

`/cursor-orchestration` in this session **is** confirmation for a Tier 3 full
cycle. Do not wait for a second yes. On explicit refusal, STOP or lower Tier.

## Role

You are the **orchestrator**. Do not do heavy implementation work in the parent
except acceptance shells and small fixes (one file / about 20 lines).

| Step | Who |
|------|-----|
| intake | parent, skill **work-intake** |
| design | parent Grok; universal **openspec-propose** from `.agents` as the procedure; Composer Task only for fact-gathering |
| Open Questions | AgentHub `notify` or the project notification integration when configured; do not implement |
| implement | `Task` `generalPurpose` `composer-2.5` per slice in `tasks.md`; acceptance = commands as written |
| browser | Composer + Browser MCP; execute `qa_plan.md`; P0 blocks review |
| review | **new** Task, review slug per model-routing, clean context; checklist in [references/review.md](references/review.md) |
| closeout | parent: CRITICAL=0, checkboxes, evidence/skip, short Composer for review tails, archive/MR, **closeout** |

Never `resume` an implementer for review. Review is not a Composer defect-pass
and not the parent after several implementation phases.

## OpenSpec integration

Use the universal skills installed in `.agents`. For Tier 3, this orchestrator
itself owns typed slices, browser QA, and fresh review. OpenSpec remains the
durable source of proposal, specs, design, contracts, QA plan, tasks, and
change status.

## Step 0 — Project context

Read `AGENTS.md`. Resolve the work using **work-intake**.

## Step 0.5 — Intake / Tier

1. Read **work-intake**.
2. Use an existing Tier `1` | `2` | `2.5` | `3` | `4` when present; otherwise
   classify from the change brief.
3. Announce task id/title, slug, branch, Tier, Process.
4. **Tier 4** → STOP for the product-foundation skill named in `AGENTS.md` or
   OpenSpec context.
5. **Tier 3** → full design + slices; `/cursor-orchestration` is confirmation.

| Tier | Process |
|------|---------|
| 1 | `direct` |
| 2 | `plan+implement` |
| 2.5 | `openspec+single-apply` |
| 3 | `openspec+orchestrated-slices` |
| 4 | `product-foundation` |

If scope grows, STOP, re-classify upward, and continue on the new route.

## Model policy

See [references/model-routing.md](references/model-routing.md).

- Parent: Cursor Grok 4.6 (session the user started).
- Default worker (fact-gathering / implement / browser): `composer-2.5`.
  `inherit` and `cursor-grok-4.5-high` are **not** slice defaults.
- Review / stuck-implement: first available slug — non-fast Grok 4.6
  (`cursor-grok-4.6-xhigh`, else `cursor-grok-4.6-high`); else
  `cursor-grok-4.5-high` when 4.6 is only `*-fast`; else `inherit` if the parent
  is on Grok; else `composer-2.5` and continue. Record fallback in Notes.
- Every `Task` must pass `model:` and `subagent_type: generalPurpose`. `inherit`
  is an explicit value, not omission.
- **Forbidden:** `*-fast`, Codex, `cursor-grok-4.5-high-fast`. `inherit` only
  when the parent is on Grok. Design stays on the parent; Composer only gathers
  facts.

## Open Questions stop (Tier ≥ 2, after design)

Blocked when proposal, `design.md`, interface/UI contracts, or another required
profile artifact has unresolved `Open Questions`, `TBD`, `BLOCKED`, or `needs
human` on a decision required to code. Out-of-scope follow-ups do not block.

On block: stay at design; report in chat; use the configured notification tool
when one exists; **do not** start implementation.

## Step 1 — Design (Tier ≥ 2; skip Tier 1)

**Parent Grok** runs the universal **openspec-propose** skill from `.agents`
(read that skill and follow it). Launch Composer `Task` **only** to gather facts
(code search, file reads), not to author proposal/specs/design/contracts/
`tasks.md`.

For `web-change`, instantiate `tasks.md` with typed slices (`domain-api` |
`infra` | `webapp` | `tests`) and gates `browser` / `review`. Empty boxes are
forbidden. Write `qa_plan.md` or its explicit Skip. Confirm apply-ready. Then
run the Open Questions stop.

## Step 2 — Implement by Tier

### Tier 1 — direct

`Task` `composer-2.5` against acceptance criteria. Update main specs if behavior
changed. Run project checks, then Step 3.

### Tier 2 — plan + implement

Create a short plan, then use Composer without phased slices. Update specs when
the project uses them.

### Tier 2.5 — `openspec+single-apply`

Give one Composer worker the apply-ready OpenSpec artifacts and the full
semantic outcome. Use the universal **openspec-apply-change** instructions from
`.agents` for change context and task-state handling. Fail acceptance → one
retry; still failing → STOP `STOPPED@implement`.

### Tier 3 — typed slices + browser (no review here)

This orchestrator runs the typed implement slices and browser directly:

1. Parent orchestrates. Each incomplete implement slice starts a `Task`
   (`generalPurpose`, `model: composer-2.5`).
2. After each child, run **Acceptance** commands **as written**.
3. One retry on fail; still failing → STOP `STOPPED@implement-<slice>`.
4. Browser executes `qa_plan.md`. Partial with P1 on the happy path: re-run
   affected scenarios or list E2E gaps. **P0 blocks review**.
5. Keep review separate from implementation and browser workers.

## Step 3 — Review (Tier 2 / 2.5 / 3)

Launch a fresh `Task` (`subagent_type: generalPurpose`, review slug from
model-routing; last resort `composer-2.5` and continue). Prompt it with `git
diff` vs base, change artifacts, and
[references/review.md](references/review.md). Never `resume`. Never use Composer
as the default when a Grok slug from the routing order is available.

The orchestrator owns acceptance: CRITICAL=0 is required to continue. Spot-fix
or launch a short Composer Task for a batched tail of findings. Unrecoverable
CRITICAL → STOP.

Tier 1 gets a light check: diff, acceptance criteria, and `openspec validate`
when specs changed.

## Step 4 — Closeout

Mechanical gate, not a third spec audit: checkboxes done, evidence or explicit
skip, CRITICAL=0. Then archive/MR per `AGENTS.md`, and run **closeout**.

- Use the repository's configured forge/MR tooling. For GitLab use `glab` or a
  printed create-MR URL when that is the documented project path.
- Always end with the status block. Send the configured project notification
  when available.

```text
cursor-orchestration — <task-id> <title>
Status: <DONE | BLOCKED@design | STOPPED@<step>>
Tier: <n> Process: <direct | plan+implement | openspec+single-apply | openspec+orchestrated-slices | product-foundation>
Branch: <branch or —>
Slug: <openspec-slug or —>
Notes: <one line; include E2E gaps if browser was Partial>
```

## Guardrails

- Never auto-start from ambient task language.
- Never `*-fast` or Codex. Never `inherit` unless the parent is on Grok.
  Never `cursor-grok-4.5-high-fast`. Never omit `model:` on a `Task`.
- Never hand the full design pass to Composer.
- Never start implementation with blocking Open Questions.
- Never require a provider-specific OpenSpec implementation skill; Tier 3
  slicing is owned here.
- Never `code-reviewer` subagent type; never `resume` an implementer for review.
- Never archive as unqualified DONE when browser Partial still has P1 on the
  happy path unless Notes list the E2E gaps.
