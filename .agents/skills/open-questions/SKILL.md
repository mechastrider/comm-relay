---
name: open-questions
description: Capture, triage, and promote unresolved CommRelay product/UX questions in docs/open-questions.md. Use when behavior is by design but the right default or discoverability is undecided, when an operator reports confusion that should not drive code yet, or when work-intake/explore surfaces competing workflows without a human decision.
---

# Open questions (CommRelay)

Unresolved **product and UX decisions** that must not drive implementation until a human chooses a direction.

**Inbox:** [`docs/open-questions.md`](../../../docs/open-questions.md) (Russian entries OK).  
**Canonical shipped behavior:** [`openspec/specs/`](../../../openspec/specs/).  
**Committed horizon:** [`docs/roadmap.md`](../../../docs/roadmap.md).  
**Deep dives:** [`docs/research/`](../../../docs/research/).

Read project [`AGENTS.md`](../../../AGENTS.md) for how this skill fits the agent workflow.

## Document ladder

| Layer | Path | Use when |
|-------|------|----------|
| Open question | `docs/open-questions.md` | Short entry: context, question, options, status `open` |
| Research note | `docs/research/<topic>.md` | Tables, code cross-check, several subtopics |
| Roadmap | `docs/roadmap.md` | Direction agreed; priority on the horizon |
| OpenSpec change | `openspec/changes/<name>/` | Ready to specify and implement |
| Task | `docs/task-tracker.md` + `docs/tasks/CR-*.md` | Scoped work with acceptance criteria |

Promotion path:

```text
open-questions.md (open)
  → roadmap.md and/or openspec/changes/<name>/
  → openspec/specs/
  → task-tracker (optional CR task)
```

## When to capture

Add or update an entry when:

- An operator or agent reports confusion, a missing affordance, or “it used to work” / “where did X go”.
- Research shows behavior matches `openspec/specs/` or an archive change, but **default, labeling, or discoverability** is still undecided.
- `work-intake` or `openspec-explore` ends in **Shaping** with material product alternatives and no authority to pick one.
- A research note (`docs/research/`) needs a single trackable question surfaced for humans.

## When not to capture

Route elsewhere instead:

| Situation | Route |
|-----------|--------|
| Clear bug or regression vs specs | Fix against `openspec/specs/` |
| Decision made; work is next | `docs/roadmap.md` and/or OpenSpec change |
| Ready to build with acceptance | `docs/task-tracker.md` + `docs/tasks/CR-*.md` |
| Pure technical how-to or one-off answer | Conversation or research note only |
| User-visible fix already chosen | Implement; use `changelog` if operators notice |

Do **not** put open questions in `CHANGELOG.md`.

## Workflow

### 1 — Triage (before asking the human)

1. Read `docs/open-questions.md` for related `open` entries (match by surface, feature, or symptom).
2. Read `openspec/specs/` and relevant `openspec/changes/archive/` paths cited in the report.
3. Distinguish:
   - **Regression** → implement fix.
   - **By design, undecided UX** → open question.
   - **Already decided in specs** → explain; close duplicate open entry if any.

### 2 — Capture

1. Use the next `OQ-NNN` id (scan the registry at the bottom of `docs/open-questions.md`).
2. Copy the template from that file; fill in:
   - **Контекст** — where the question came from.
   - **Вопрос** — one decision-shaped sentence.
   - **Как сейчас** — factual behavior + spec/archive links.
   - **Варианты** — only alternatives already visible; do not invent product scope.
   - **Связи** — research notes, mockups, issues.
   - **Продвижение** — likely next artifact (`roadmap`, OpenSpec change name, FAQ).
3. Set **Статус:** `open`.
4. If the write-up is long, add `docs/research/<topic>.md` and link it from the entry.

Keep entries short. The inbox is for decisions, not implementation notes.

### 3 — Discuss

- Present the entry (or link) to the human; do not re-litigate settled specs unless evidence contradicts them.
- Update **Варианты** when the human adds constraints or rejects an option.
- Stay in `open` until the human explicitly picks a direction or defers with “not now”.

**Guardrail:** Do **not** implement product changes to “resolve” an open question without explicit human approval.

### 4 — Promote

When the human chooses a direction:

1. Set status to `promoted` (work scheduled) or `resolved` (already reflected elsewhere).
2. Record the link: roadmap bullet, `openspec/changes/<name>/`, or spec path.
3. Trim duplicate prose from the open-question body once the canonical answer lives in specs, roadmap, or FAQ.
4. Continue with the normal delivery path:
   - `openspec-propose` or `openspec new change` for observable behavior changes.
   - `openspec-apply-change` / implementation after artifacts exist.
   - Optional `docs/task-tracker.md` CR when the team uses task files.

### 5 — Close without implementation

Set status `wont-fix` with a one-line rationale (e.g. out of scope, acceptable trade-off documented in FAQ).

## Integration with other skills

| Skill | Role |
|-------|------|
| `work-intake` | During §2 research, scan `docs/open-questions.md`; if maturity stays **Shaping** for product UX, capture or update an open question instead of opening an OpenSpec change |
| `openspec-explore` | Exploration may end by filing an open question; do not create a change folder for tentative product indecision |
| `openspec-propose` | After promotion, when the decision is ready to specify |
| `changelog` | Only after shipped behavior changes — not when filing or closing open questions |

## Status values

| Status | Meaning |
|--------|---------|
| `open` | Awaiting human decision |
| `promoted` | Linked to roadmap or active OpenSpec change |
| `resolved` | Answer lives in specs/roadmap/FAQ; entry kept as history |
| `wont-fix` | Consciously not pursuing |

## Example trigger

Operator: “Копирование ссылки с `preset` пропало из Studio.”

1. Trace code and archive changes → pinned URL exists but is buried; follow-active is primary by design.
2. File **OQ-001** (or update it) — question is default copy target and discoverability, not a missing feature.
3. Do not change copy buttons until the human picks an option from **Варианты**.
