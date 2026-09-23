# Model routing

Use this reference for every collaboration subagent started by
**`codex-orchestration`**. Resolve roles here rather than assigning models by
workflow Tier.

## Session ceiling

The parent stays on the model and reasoning effort selected in the chat. Resolve
both effective values from runtime session metadata; a model catalog's default
is not the current session setting. Never switch or re-create the parent to
satisfy a role default.

Apply two independent ceilings to every role, retry, repair, and fallback:

- Model order for this workflow: `gpt-6-luna` < `gpt-6-sol` < `gpt-6-astra`.
  A child may use the parent's model or a lower model in this order.
- Effort order: `none` < `low` < `medium` < `high` < `xhigh` < `max` < `ultra`.
  A child's effort may not exceed the parent's effective effort.

These are routing rules, not claims that model/effort pairs have equivalent
capability or cost. A weaker model does not permit higher effort: an Astra
`medium` parent cannot start Sol `high`. Project defaults and role assignments
cannot raise either ceiling. If the user requests a conflicting assignment,
explain the conflict before starting that role; do not silently exceed the
session ceiling.

Resolve user role preferences first, project preferences second, and the table
below last, then cap the result on both axes. Validate against the runtime's
actual supported models and efforts. Choose the highest supported effort no
higher than both the requested effort and the parent ceiling; never round up.
For example, if Luna lacks `ultra`, cap it at its highest supported lower level.
If no supported value fits, the role is blocked. Do not assume API model
capabilities match the collaboration runtime.

Do not rank unknown or legacy model IDs by guessing. Block an unranked
cross-model assignment until its ordering is established. For an unranked parent,
use its exact model through supported inheritance and cap effort as above;
report that cross-model routing is unavailable. Re-resolve the ceiling before
new work when the user changes session settings. Do not reuse a running or
idle worker whose configuration exceeds the new ceiling.

## Role defaults

All roles use fresh context. All values below are subject to the session ceiling.

| Role | Preferred model | Preferred effort |
|---|---|---|
| Design and OpenSpec authoring | parent model | parent effort |
| Read-only fact gathering, code location, log collection | `gpt-6-luna` | `medium` |
| Implementation slice, tests, corrections | `gpt-6-sol` | `medium`; `high` for a difficult slice |
| Profile QA requiring behavioral analysis | `gpt-6-sol` | `medium`; `high` for difficult analysis |
| Stuck implementation follow-up | parent model | parent effort |
| Independent review | parent model | parent effort |

Use higher implementation/QA effort for reasoning-heavy contracts, migrations,
concurrency, or difficult failure analysis, not merely because a task is large.
First improve scope and acceptance evidence. Luna is optional for useful,
self-contained fact gathering; do not insert a Luna pass before ordinary Sol
implementation. With a Luna parent, every role is capped at Luna.

Examples without role overrides:

| Parent | Implementation | Design and review |
|---|---|---|
| Astra `xhigh` | Sol `medium` or `high` | Astra `xhigh` |
| Astra `medium` | Sol `medium` | Astra `medium` |
| Sol `high` | Sol `medium` or `high` | Sol `high` |
| Sol `medium` | Sol `medium` | Sol `medium` |
| Luna `low` | Luna `low` | Luna `low` |

## Spawn contract

Model, reasoning, and conversation inheritance are separate. Use
`fork_turns: "none"` for fresh context. Pass runtime-reported exact model and
effort values, or omit the corresponding override only when the runtime
explicitly guarantees inheritance of that setting with fresh context. Never
use a literal `inherit` model ID unless the tool supports it.

When effective session settings are unavailable, use guaranteed inheritance of
both model and effort without explicit overrides; report the pair as
session-inherited. Do not combine an unknown ceiling with guessed role defaults.
If guaranteed inheritance is unavailable too, ask for the missing ceiling
before starting dependent workers and report `BLOCKED@runtime` until resolved.
Do not ask the user to repeat settings the runtime already exposes.

Every `spawn_agent` call includes:

- the resolved supported model and effort, explicit or inherited as above;
- `fork_turns: "none"`, including for parent-model roles;
- a unique lowercase task name;
- a self-contained bounded prompt with files/artifacts to read, outcome,
  non-goals, permissions, acceptance, expected report, and stopping conditions;
- a reminder that the working tree is shared and nested delegation is forbidden.

Pass relevant OpenSpec context paths and project evidence from disk; do not rely
on the parent's conversation. Use `followup_task` for a bounded correction to the
same semantic slice within its retry budget. Never turn an implementer into a
reviewer. Review and stuck-implementation follow-ups always start fresh.

Use bounded waits rather than frequent polling, while maintaining user-facing
progress updates. Check available slots when necessary before spawning.

## Concurrency

The parent occupies one slot. Parallelize only independent read-only work. Code
edits, migrations, generated-file updates, task checkboxes, QA fixture
mutations, main-spec sync, archive, and review repairs are sequential.

No subagent may spawn its own subagents. Keep role and write ownership visible
to the parent.

## Failure policy

If a required role cannot start, report the role and runtime error. Use an
already authorized alternative only after validating both ceilings and record
it in Notes; otherwise report `BLOCKED@runtime` for dependent work. Never
silently substitute a model, fall back to Terra or Cursor, or make the parent
an implementation fallback. Unavailable unused models do not block a run.

For failed slice acceptance:

1. Send the same implementation agent one correction with exact failing evidence.
2. If acceptance still fails, allow one fresh parent-model follow-up only when
   requirements and environment are sound and there is a concrete new hypothesis
   or reason stronger reasoning within the ceiling would help.
3. Rerun acceptance and stop at `STOPPED@implement-<slice>` if it still fails;
   stop earlier when no justified follow-up exists.

When the original worker already matches the parent's model and effort, this
is a fresh-context retry, not an escalation. Do not raise settings beyond the
parent or restart the retry budget by changing models or agents.

Profile-QA and review loops are also finite: one implementation-role repair
batch and one rerun or re-review. Record retries, fresh-context follow-ups,
actual model/effort increases, and routing deviations in the final report.
