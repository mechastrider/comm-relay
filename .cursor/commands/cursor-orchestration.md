---
name: /cursor-orchestration
id: cursor-orchestration
category: Workflow
description: >-
  Orchestrate one fullstack web task — Grok design, Composer slices, browser,
  then a fresh Grok review Task
---

Opt-in orchestrator for **one task**. Classify via **work-intake**, route by
Tier, delegate implementation to `Task` subagents, then close out. Do not
auto-invoke from ambient “start the task” language.

**Parent:** Cursor Grok 4.6. **Implement/browser:** `composer-2.5`.
**Review/stuck implementation:** fresh Task, first available non-fast Grok 4.6;
then allowed 4.5/inherit fallbacks from `model-routing.md`; finally Composer.
Never `*-fast` or Codex. Never omit `model:`. Design stays on the parent.

**Input:** tracker key, free-text request, symptom, idea, or existing change
slug.

## Actions

1. Read and run
   [cursor-orchestration](.cursor/skills/cursor-orchestration/SKILL.md), including
   [model-routing.md](.cursor/skills/cursor-orchestration/references/model-routing.md).
2. Intake/Tier via **work-intake**. Announce Tier, Process, and model policy.
3. Tier 3: this command is confirmation for design + slices.
4. Design on the parent using the universal **openspec-propose** skill from
   `.agents`. Stop on blocking Open Questions.
5. Implement by Tier. Tier 3 is orchestrated here as typed Composer slices plus
   browser QA; no separate provider-specific OpenSpec workflow is required. P0
   blocks review.
6. Review with a **fresh** Task and
   [review.md](.cursor/skills/cursor-orchestration/references/review.md).
7. Closeout: mechanical gate + **closeout**.

## Output

```text
cursor-orchestration — <task-id> <title>
Status: <DONE | BLOCKED@design | STOPPED@<step>>
Tier: <n> Process: <direct | plan+implement | openspec+single-apply | openspec+orchestrated-slices | product-foundation>
Branch: <branch or —>
Slug: <openspec-slug or —>
Notes: <one line>
```

## Guardrails

- Opt-in only.
- Every Task: `generalPurpose` + explicit allowed `model:`.
- No `code-reviewer`; no implementer `resume` for review.
- Parent does not implement slices; one acceptance retry, then STOP.
