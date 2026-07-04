---
name: task-delegation
description: Orchestrate coding work by routing each task to the right executor — an Opus subagent for hard design/complex coding/deep research, the Cursor CLI (composer-2.5) for medium-and-below coding, and inline for trivial fixes. Covers slicing work along semantic seams, writing self-contained task files, signalling when the Cursor plugin is unavailable, and reviewing every diff. Use in any project that runs an orchestrator-executor model.
---

# Task Delegation

Run coding work as an **orchestrator-executor loop**. The **orchestrator** (you)
understands the request, explores the codebase, plans, **routes** each task to the right
executor, **reviews** the result, and decides the next step. Executors write the code. The
orchestrator does not hand-write product code beyond trivial fixes — it plans, routes, and
reviews.

> Executors have **no conversation context**. Every delegation must be self-contained.

## Route by task tier

Pick the executor by how hard the task is, not by habit:

| Tier | Examples | Executor |
|---|---|---|
| **Hard** | architecture/design decisions, thorny spec elaboration, complex multi-file coding, deep research | **Opus subagent** (dedicated, high-reasoning) |
| **Medium & below** | well-scoped features, refactors, tests, migrations, mechanical edits | **Cursor CLI** (`cursor-agent`, model `composer-2.5`) via the plugin |
| **Trivial** | a typo, a one-line rename, a mechanical fix a round-trip would only slow down | **orchestrator, inline** |

Never delegate the **review** or the **routing decision** — those stay with the orchestrator.
Never let a review command apply its own findings — collect them, then delegate the fix.

## Cursor executor — mechanics

- **Model: strictly `composer-2.5`.** This is the single source of truth — when Cursor ships
  a newer composer, bump the number **here** and nowhere else. Do **not** use a `-fast`
  variant or escalate to another model. If a slice fails on `composer-2.5`, the fix is a
  **sharper task file**, not a bigger model.
- **Check the plugin is available before delegating, and signal if it is not.** Confirm
  `cursor-agent` is on PATH and authenticated (the API key often lives only in a login
  shell). If the Cursor plugin/CLI is unavailable or unauthenticated, **stop and say so
  explicitly** — do not silently hand the task to another executor or write the code
  yourself. Surface it to the user (or, only with their go-ahead, reroute a hard-enough
  task to the Opus subagent).
- **Invocation:** put the task in a **file**; send a one-line pointer prompt. Pass the model
  as a real flag, not prose. Run quick slices in the foreground; for long slices run in the
  **background** and prepare the next task file meanwhile (poll the job state — background
  jobs may not notify on their own). If you manage commits yourself, disable the executor's
  git gate and tell it "leave changes in the working tree; do not commit."

## Opus subagent — for the hard tier

- **Design/architecture/spec:** give it the problem, the relevant specs/skills, and the
  constraints; ask for a **plan or design writeup with tradeoffs and non-goals — not code
  edits**. Fold the returned plan into your artifacts, then slice it for Cursor.
- **Complex coding / deep research:** it may produce code or a report; the orchestrator
  still **reviews** the output and slices any follow-up.
- Reserve it for genuinely hard work — routine scoping and obvious slices stay inline.

## The loop

1. **Plan** — explore, decide the change, **route** it (tier), and for coding break it into
   slices (see *Slicing*).
2. **Delegate** — write the full slice into a task file; send a one-line pointer.
3. **Execute** — the executor produces the code/plan for one slice.
4. **Review** — read the diff **yourself**; run the verify commands **yourself**.
5. **Iterate** — resume the same thread for tight follow-ups, or a fresh delegation when the
   topic changed.
6. **Commit / close out** — commit the green slice; move on.

## Principle 1 — Slice along semantic seams (highest-leverage decision)

Where you cut matters more than how small you cut.

- **Cut vertically, by meaning — not horizontally, by layer.** A change that renames one
  concept across, say, storage + service + tests is **one** slice, not one per layer.
  Horizontal slicing of a vertical change leaves broken intermediate states and spawns pure
  bookkeeping "fix the fixtures" slices.
- **Green-at-every-commit test.** A correctly-cut slice builds and passes tests on its own.
  *If a slice can't be green alone, it's the wrong seam* — merge it with what makes it green
  (usually its downstream call-sites and test fixtures).
- **Include the fallout.** When a slice changes a contract (a signature, an invariant, a
  storage key), the call-site updates and mechanical fixture rewrites belong **in that same
  slice**. Do not fence them out ("don't touch package X") — fencing creates red states and
  extra round-trips.
- **Separate only genuinely independent work.** An orthogonal add-on that shares no contract
  is its own slice. Coupled work is not.
- **Size, once the seam is right:** statable in **≤5 acceptance bullets**, roughly **≤10
  files**, **≤2 layers**. Do **not** over-shrink — one coherent 9-file slice beats three red
  3-file micro-slices. Good task files make larger coherent slices land in one shot.

## Principle 2 — The task file is the interface

Write the whole task into a **file**; the delegation prompt is one pointer sentence
("Read `<file>` fully and execute it exactly"). This keeps shell quoting trivial, makes the
task reviewable/versionable, and forces you to bake in everything a context-less executor
needs.

```markdown
# <Slice name>

## Goal
1–2 sentences: the outcome, not the steps.

## Repo context
- Point at the project's AGENTS.md + the specific skill(s) to read.
- Name the exact files/functions to change and their CURRENT behavior.
- State what PRIOR slices already landed, so this one builds on them.

## Acceptance criteria
Numbered, testable, specific. These become the tests.

## Files to touch
Explicit list — bounds the blast radius and anchors your review.

## How to verify
The exact commands that must pass (build + test + lint), copy-pasteable.

## Guardrails
- What NOT to touch; invariants to preserve.
- "If X seems wrong (a real production gap, not a fixture), STOP and report — don't patch."
- "One slice only, no unrelated refactors."
```

*Acceptance criteria + Files to touch + How to verify* are what turn a delegation into a
one-shot success. Vague task file → drift and rework.

## Principle 3 — Review is not optional

The executor's summary is a **claim**, not proof.

- **Read the diff yourself** (`git diff --stat`, then the substantive files).
- **Run the verify commands yourself** — never trust "all green" in the summary.
- **Look for:** scope creep beyond *Files to touch*; tests or guardrails weakened to force
  green; and **unrequested production changes** — evaluate these rather than reflexively
  accepting or rejecting. Sometimes the executor surfaces a real gap you under-scoped (a
  call-site of the contract you're changing) — fold it in. Sometimes it's drift — revert it.
- A read-only second-opinion review is fine — but it reports only; it never applies fixes.

## Principle 4 — Iterate deliberately

- **Resume the same thread** for a tight follow-up that shares context ("also cover the 429
  path").
- **Fresh delegation** when the topic changed or the previous run drifted — a stale thread
  drags its confusion forward.
- **Don't escalate the model on failure** — sharpen the task file and re-delegate.
- **Executor-surfaced findings are signal**, not noise — evaluate, then scope them in or
  schedule the next slice.

## Anti-patterns

- **Horizontal slicing of a vertical change** → red intermediate states, bookkeeping slices.
- **Fencing out the mechanical fallout** → forces a separate fixup slice and a red suite.
- **Over-shrinking** → death by round-trips.
- **Trusting the summary** → skipping your own diff-read and verify run.
- **Escalating the model on failure** → the fix is almost always a sharper task file.
- **Silently proceeding when the Cursor plugin is unavailable** → signal it instead.
- **Delegating design or review** → design goes to the Opus subagent as a *plan*; review
  never leaves the orchestrator.

## Worked example (shape)

Rename a stored key from a nested path to a flat id across catalog → lock → service → a
downstream command → tests:

1. Slice 1 (foundational, independent): add a resolver returning both keys. Additive, green.
2. Slice 2 (**one vertical slice**): flip the storage/validation contract **and** every
   consumer **and** all fixtures that assert the old shape — to green. Don't split the
   consumers apart; they share the contract. During review the executor flags that a
   downstream command also read files by the old key — a call-site you under-scoped; accept
   the minimal fix into the slice rather than ship it broken.
3. Slice 3 (independent optional feature): the orthogonal add-on — separate, shares no
   contract with slice 2.

## Per-project configuration

Keep this skill portable — read the volatile bits from the consuming project's **AGENTS.md**:
the exact verify commands (`task test`, `go test ./...`, `npm test`, …), the Cursor
auth/env recipe, and any slash-command wrappers for delegate/resume/review. This skill owns
the **method and the routing**; AGENTS.md owns the project **mechanics**. The Cursor model
(`composer-2.5`) is pinned in this skill on purpose.
