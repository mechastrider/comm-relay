# Model routing

Use this reference for every collaboration subagent started by
**`codex-orchestration`**.

## Fixed roles

| Role | Model | Effort | Context |
|---|---|---|---|
| Design and OpenSpec authoring | `gpt-5.6-sol` | `xhigh` | fresh |
| Read-only fact gathering | `gpt-5.6-terra` | `medium` | fresh |
| Implementation slice | `gpt-5.6-terra` | `high` | fresh |
| Profile QA | `gpt-5.6-terra` | `high` | fresh |
| Stuck implementation escalation | `gpt-5.6-sol` | `high` | fresh |
| Independent review | `gpt-5.6-sol` | `xhigh` | fresh |

Reserve Sol `max` for an explicitly justified, high-risk follow-up review. Do
not raise effort merely because a task is large; first improve semantic
boundaries and acceptance evidence.

## Spawn contract

Every `spawn_agent` call includes:

- the exact model and reasoning effort from the table;
- `fork_turns: "none"` for model override and role isolation;
- a unique lowercase task name;
- a self-contained bounded prompt with files/artifacts to read, outcome,
  non-goals, permissions, acceptance, expected report, and stopping conditions;
- a reminder that the working tree is shared and nested delegation is not
  allowed.

Do not rely on inherited conversation context. Pass only the relevant OpenSpec
context paths and project evidence from disk.

Use `followup_task` only for the single correction retry of the same semantic
slice. Never use it to turn an implementer into a reviewer. Review and Sol
escalation always use a fresh `spawn_agent` call.

Use `wait_agent` with a long bounded wait instead of frequent polling. Check
available slots when necessary before spawning.

## Concurrency

The parent occupies one slot. Parallelize only independent read-only work. Code
edits, migrations, generated-file updates, task checkboxes, QA fixture
mutations, main-spec sync, archive, and review repairs are sequential.

Implementation and review agents may not spawn their own subagents. Keep role
and write ownership visible to the parent.

## Failure policy

If `gpt-5.6-terra` or `gpt-5.6-sol` cannot start, report `BLOCKED@runtime`. Do
not silently use `inherit`, Luna, an older GPT model, another provider, or the
parent as implementation fallback.

For failed slice acceptance:

1. one correction retry on the same Terra agent;
2. one fresh Sol `high` escalation only when requirements and environment are
   sound and stronger implementation reasoning is plausibly useful;
3. rerun acceptance and stop when it still fails.

Profile-QA and review loops are also finite: one Terra repair batch and one
rerun or re-review. Record every retry and escalation in the final Run field.
