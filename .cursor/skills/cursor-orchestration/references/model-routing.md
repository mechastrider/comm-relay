# Model routing (cursor-orchestration)

Strict allow-list for every `Task` subagent launched by
**cursor-orchestration**.

## Parent vs workers

| Role | Where | Model |
|------|-------|-------|
| Orchestrator | Current parent session | Cursor Grok 4.6; owns design, decisions, acceptance, STOP/continue, and closeout |
| Fact-gathering / implement / browser | `Task` | Default `composer-2.5` |
| Review | Fresh `Task`, clean context | First available review slug below; never `resume` |

Do not give Composer the full design pass. Composer may collect facts for the
parent.

Escalate an implementation worker off Composer only when acceptance failed after
the one retry, or a CRITICAL finding cannot be repaired through a bounded
Composer tail. Stuck implementation uses the same slug order as review.

## Review / stuck-implementation slug order

Pick the **first available** `model` value. Do not skip a step to reach Composer
when a higher option is listed:

1. Non-fast Grok 4.6 from the current Task allow-list:
   `cursor-grok-4.6-xhigh`, else `cursor-grok-4.6-high`.
2. If no non-fast Grok 4.6 is listed, the Grok 4.6 family in the allow-list (if
   any) is only `*-fast`, and `cursor-grok-4.5-high` is listed, use
   `cursor-grok-4.5-high`. Do not use `cursor-grok-4.5-high-fast`.
3. If no explicit suitable Grok slug is listed, but the parent session is on
   Grok, pass explicit `inherit`.
4. Otherwise use `composer-2.5` and continue. Record the fallback in Notes.

Never select a fast slug just to avoid a fallback.

## Allowed Task model values

| Role | Exact value | When |
|------|-------------|------|
| Default worker | `composer-2.5` | Facts, apply-change, slices, browser |
| Review / stuck | First valid value from the order above | Review always; implementation only when stuck |

Every Task must pass both `model:` and `subagent_type: generalPurpose`.
`inherit` is an explicit value, not omission. Never resume an implementer for
review.

## Unavailable slug

Continue down the routing order. A missing Grok worker slug alone is not a STOP
condition. Last resort is `composer-2.5`; never substitute a fast slug. Pass
`inherit` only when the parent is on Grok and no explicit suitable slug exists.
Keep design on the parent and record fallback in Notes.

## Hard bans

- `composer-2.5-fast` and every `*-fast` slug;
- `inherit` when the parent is not on Grok;
- Codex, Claude, GPT, or other model slugs not listed here;
- `code-reviewer` subagent type;
- resuming an implementer for review.

`cursor-grok-4.5-high` is allowed only as the review/stuck fallback above, not
as a slice default. Ignore project agent files that pin a banned worker model;
pass an allowed `model:` explicitly.

## Quick decision

1. Design → parent Grok; Composer may gather facts only.
2. Implement/browser → `composer-2.5`.
3. Review/stuck → non-fast Grok 4.6 → allowed 4.5 fallback → `inherit` when the
   parent is Grok → Composer last resort.
4. Never fast/Codex; never omit `model:`.
