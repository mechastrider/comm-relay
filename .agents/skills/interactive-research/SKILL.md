---
name: interactive-research
description: Triage CommRelay stream-session notes and interactive product ideas, maintain docs/interactive/backlog.md, and reconcile initiative status with research, open questions, roadmap, and OpenSpec. Use when reviewing a stream transcript or session analysis, recording an interactive idea, updating whether an initiative is planned or implemented, or reorganizing interactive-system documentation.
---

# Interactive research workflow (CommRelay)

Turn noisy stream observations into a navigable initiative registry without treating every idea as a commitment.

## Sources of truth

| Layer | Path | Authority |
|---|---|---|
| Raw local evidence | `var/session_analysis/` | Private working material; never assume it exists on another machine |
| Interactive vision | `docs/interactive/vision.md` | Stable product hypothesis, not status or schedule |
| Initiative registry | `docs/interactive/backlog.md` | Stable `INT-NNN` id, current lifecycle status, and routing links |
| Durable research | `docs/research/` | Transferable evidence, comparisons, and dated snapshots |
| Human decision inbox | `docs/open-questions.md` | Unresolved alternatives that must not drive implementation |
| Committed horizon | `docs/roadmap.md` | Chosen product direction and relative order |
| Delivery | `openspec/changes/` | Proposed or active observable behavior changes |
| Shipped behavior | `openspec/specs/` | Canonical implemented contract |

Read `docs/interactive/README.md` and `docs/interactive/backlog.md` before editing this area. For product/UX indecision, also use the `open-questions` skill.

## Triage a session or new idea

1. Read only the relevant local analysis, transcript excerpt, or research note. Treat generated summaries as hypotheses, not facts.
2. Search the backlog by outcome and synonyms before allocating a new id. Update the existing initiative when several sessions describe the same user result.
3. Separate observations:
   - current behavior or regression claim;
   - potential improvement;
   - unresolved product choice;
   - already confirmed decision.
4. Verify current behavior against `openspec/specs/`, relevant archived changes, active changes, and code when necessary. Do not infer `implemented` from an old note or prototype alone.
5. Add or update the smallest independently deliverable initiative. Preserve its id when wording, evidence, or status changes.
6. Route detail instead of copying it into the registry:
   - lengthy transferable evidence → `docs/research/<topic>.md`;
   - unresolved alternatives → `docs/open-questions.md` and status `needs_decision`;
   - explicit commitment → `docs/roadmap.md` and status `planned`;
   - approved delivery work → OpenSpec change and status `in_progress`;
   - shipped contract → canonical spec link and status `implemented`.

## Backlog rules

Use the existing columns and status vocabulary in `docs/interactive/backlog.md`.

- Allocate the next numeric `INT-NNN`; never renumber or reuse an id.
- Describe an observable product outcome, not an implementation technique.
- Keep one result per row. Split a broad epic into independently verifiable initiatives instead of using `partially_implemented`.
- Keep source references short. A local source is a date and session label, never a Markdown link into `var/`.
- Assign `now`, `next`, or `later` only when the user or roadmap explicitly establishes priority. Otherwise use `—`.
- Set `needs_decision` only with an `OQ-NNN` link.
- Set `in_progress` only for an active, approved OpenSpec change; unfinished experimental code may instead be `needs_decision` or `parked`.
- Set `implemented` only after finding the canonical spec that describes the result. Link the spec; an archived change may be added as historical evidence.
- Move rows between lifecycle sections; do not duplicate them to preserve history.
- `candidate`, `needs_research`, and `needs_decision` are not authorization to implement.

## Local session analyses

Keep complete transcripts, screenshots, and automated analyses under `var/session_analysis/`, preferably one dated directory per stream. `var/` is ignored by Git.

Do not commit raw material or copy participant data merely to support an idea. If evidence must travel with the repository, write a focused, sanitized research-note and link that instead.

After triage, leave raw notes intact. The durable result is the updated initiative, open question, or research-note.

## Status reconciliation

When a relevant OpenSpec change is created, archived, or synced:

1. Find every related `INT-NNN`.
2. Update its status and canonical/next link.
3. Split the initiative if only one independently useful part shipped.
4. Remove stale implementation claims from roadmap or active research; preserve dated source material under `docs/research/archive/` with a supersession note.
5. Keep `docs/interactive/vision.md` free of task state and sequencing.

Do not copy full requirement text from OpenSpec into the backlog. The registry answers “what and where”; specs answer “exactly how it behaves.”

## Change boundaries

Maintaining the registry, research index, or archive is a documentation workflow change and does not itself require OpenSpec or CHANGELOG. If triage leads to an observable product change, follow normal `work-intake` / OpenSpec delivery and apply the streamer-visible CHANGELOG gate separately.
