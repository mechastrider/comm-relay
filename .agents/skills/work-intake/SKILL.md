---
name: work-intake
description: "Use when the user asks to investigate, start, pick up, shape, or begin work from an idea, symptom, tracker issue, or free-text request. Researches the repository before asking answerable questions, turns uncertain input into a change brief, classifies project profile and effort, and routes to exploration, direct work, an OpenSpec schema, product foundation, or an outer orchestration workflow."
---

# Work Intake

The entry point when a user brings an idea, symptom, question, tracker item, or
task description. Its job is **research, shaping, and routing**, not product-code
implementation: resolve the input, investigate what the repository can answer,
identify the decisions that still need a human, classify the work, and hand a
self-contained change brief to the right execution path.

Adapt every step to the project. Read the project `AGENTS.md` / `CLAUDE.md`
first. It declares trackers, planning systems, OpenSpec usage, project type,
verification commands, and local workflow skills. Project instructions win on
concrete tools and paths.

## Step 0 — Identify the input shape

Treat the tracker as one possible source, not the definition of the work.

| Input | Initial route |
|-------|---------------|
| Tracker key, issue number, or ticket URL | Fetch and reconcile (§1) |
| Concrete free-text change | Inspect the repository, then assess readiness (§2–§3) |
| Symptom or suspected bug | Reproduce or trace the current behavior (§2) |
| Question or technical uncertainty | Research first (§2); a code change may not be needed |
| Product idea or desired outcome | Explore the problem and constraints (§2–§3) |
| Existing OpenSpec change | Read its status and artifacts; route to update/apply/verify |

If the user gives multiple sources, reconcile them and surface conflicts. Do not
silently choose one as authoritative unless project instructions say so.

## Step 1 — Resolve external task sources when present

Resolve the tracker from project instructions. There is no default tracker.

1. Fetch the item using the configured integration.
2. Pull the title, description, acceptance criteria, labels, linked work,
   attachments, and status when available.
3. Reconcile tracker content with the user's current description. The user's
   explicit correction wins for this session, but record the mismatch.
4. If the tracker is unavailable, do not invent content from the key. Continue
   only when the user also supplied enough free text; otherwise report the
   missing integration and ask them to paste the relevant content.

Fetching a ticket does not make it implementation-ready. Continue through
research and shaping.

## Step 2 — Research before interrogation

Investigate all questions that the repository, existing specs, documentation,
tests, logs, or safe read-only commands can answer. Typical work:

- map the affected modules, public interfaces, data stores, UI surfaces, and
  platform boundaries;
- find current behavior and conventions rather than asking the user to restate
  them;
- reproduce a symptom or trace the relevant execution path when safe;
- read active OpenSpec changes and main specs to detect overlap or conflict;
- identify existing verification and release mechanics;
- distinguish observed facts, inferences, assumptions, and unknowns.

Use **openspec-explore** as the thinking stance when it is installed and the
request is exploratory or ambiguous. Exploration is read-only with respect to
product code. Do not create an OpenSpec change merely to hold tentative notes.

Ask the user only about decisions research cannot settle: product intent,
acceptable trade-offs, scope boundaries, compatibility promises, or authority
for consequential external actions. Ask material questions in one focused
batch. Do not block on minor details that can be recorded as reasonable
assumptions.

## Step 3 — Determine work maturity

| Maturity | Evidence | Route |
|----------|----------|-------|
| **Research** | The problem, cause, or desired outcome is still unclear | Continue exploration; no implementation yet |
| **Shaping** | The problem is understood, but scope, behavior, or approach still has material alternatives | Produce options and a recommended change brief |
| **Ready** | Outcome, scope, acceptance, and blocking decisions are clear | Classify profile/tier and select a planning route |
| **Execution** | A plan or OpenSpec change already exists and is coherent | Route to update, apply, verify, or orchestration |

Research may legitimately end with “no change needed,” a documentation answer,
or a follow-up investigation. Do not force every inquiry into implementation.

## Step 4 — Build the change brief

Before routing ready work, summarize a compact, self-contained handoff:

```text
Problem / desired outcome:
Evidence and current behavior:
Scope:
Non-goals:
Acceptance criteria:
Constraints and compatibility:
Open decisions:
Assumptions:
Project profile:
Affected facets:
Tier and recommended process:
Recommended OpenSpec schema (if any):
```

The brief normally lives in the conversation. Persist it only when the user asks
or the project declares a durable research/change-brief location. Do not create
an ad-hoc planning directory when the repository already uses OpenSpec, ADRs, or
another planning system.

## Step 5 — Classify project profile and affected facets

Infer the profile from repository evidence; ask only when the repository is
mixed and the choice changes the workflow.

Profiles:

- `library` — reusable package with public source/binary API and consumers;
- `service` — backend, API, worker, daemon, or infrastructure service;
- `web` — browser UI, optionally with a service and database;
- `desktop` — installable desktop client with OS integrations;
- `mobile` — Android/iOS application with device lifecycle constraints;
- `mixed` — monorepo or change spanning more than one deployable product.

Affected facets select the artifacts and QA gates that matter:

- public API / compatibility;
- HTTP, RPC, event, or IPC contracts;
- persistent data and migration;
- UI/navigation/accessibility;
- integration and authorization boundaries;
- offline/sync/background lifecycle;
- OS/device/platform behavior;
- packaging, upgrade, rollout, or publishing;
- performance, reliability, security, and observability.

Project type describes what the repository can contain. Facets describe what
this particular change actually touches.

## Step 6 — Classify by effort

Use scope and uncertainty signals rather than estimated token counts:

- number of independently meaningful behaviors changing;
- breadth of modules and deployable components;
- public compatibility or migration impact;
- new or changed data/interface contracts;
- UI, platform, packaging, or external integration work;
- verification matrix and rollout risk;
- unresolved decisions after research.

| Tier | Meaning | Typical route |
|------|---------|---------------|
| **1 — Quick fix** | One local behavior, no new contract or migration, no open decision | Direct implementation and focused verification |
| **2 — Bounded change** | Coherent change that fits one focused implementation pass | Short plan or base `spec-driven` OpenSpec |
| **2.5 — Contract change** | Public interface, persistence, UI contract, or platform boundary needs explicit design | Profile OpenSpec schema; one broad semantic implementation pass when safe |
| **3 — Full feature** | Several facets, cross-component behavior, migrations, or substantial QA/release risk | Profile OpenSpec schema plus outer orchestration |
| **4 — Product/program** | New product or a series of dependent features | Product-foundation / roadmap process |

The tier is a working estimate. If research or implementation reveals a new
contract, migration, deployable component, or independent milestone, stop and
reclassify instead of stretching the smaller route.

## Step 7 — Select the planning schema

Use the repository's configured default unless the brief justifies another
installed profile. Resolve the authoritative OpenSpec root, run `openspec
schemas --json`, and do not assume every hub profile is vendored. Recommended
routes when available:

| Change | Schema |
|--------|--------|
| Small or implementation-only change | `spec-driven` |
| Public library contract or release compatibility | `library-change` |
| Service/API/data/integration feature | `service-change` |
| Full browser-facing feature | `web-change` |
| Desktop UI/platform/storage/distribution feature | `desktop-change` |
| Mobile UI/sync/permissions/device/release feature | `mobile-change` |

Profile schemas are deliberately comprehensive. Use them for Tier 2.5–3 work;
do not make every small change produce full profile artifacts. When a selected
profile artifact does not apply, write its explicit `Not applicable` section as
the schema instructs so the decision persists across sessions.

If the best-matching profile is not installed, use the configured primary
schema when it can represent the change, or the built-in `spec-driven` fallback
for bounded work. Report the missing profile as a project-configuration option;
intake does not vendor schemas or edit the skills lock as a side effect.

Schema selection is part of the handoff, not hidden executor policy. When the
intake runs inside an explicitly invoked outer orchestrator, that orchestrator
may continue with the recommended schema without a second confirmation unless a
material product decision remains open.

## Step 8 — Route by tier

### Tier 1 — Direct

Implement directly or hand off to the active outer orchestrator. If behavior
covered by main specs changes, update it through the project's OpenSpec sync
workflow. Run focused checks and a light diff review.

### Tier 2 — Plan or base OpenSpec

Use a short plan when the behavior is already clear. Use `spec-driven` when the
change benefits from durable proposal/spec/design/tasks artifacts. Do not split
one coherent outcome into layer-by-layer worker jobs.

### Tier 2.5 — Profile OpenSpec

Create the selected profile change, author the required artifacts, resolve
blocking questions, then implement as one broad semantic slice or a small number
of independently reviewable slices. Do not introduce phased orchestration merely
because the schema contains several artifacts.

### Tier 3 — Full orchestration

Use the profile schema and the outer orchestrator selected by the user or
project:

- **cursor-orchestration** for the Cursor-native Grok + Composer workflow;
- **change-orchestration** for a Codex/Claude parent with Cursor workers.

An explicit invocation of either orchestration skill confirms its full cycle.
Ambient “start this task” language does not auto-select a provider-specific
orchestrator.

### Tier 4 — Product foundation

Route to the product-foundation skill named by project instructions. If none is
installed, stop after the brief and recommend establishing product goals,
architecture boundaries, dependency order, and a story map before opening a
single large OpenSpec change.

## Guardrails

- Research before asking questions the repository can answer.
- Never fabricate tracker content or business rules.
- Keep facts, inferences, assumptions, and open decisions distinguishable.
- Do not create product code during standalone intake/explore.
- Do not force exploratory work into an OpenSpec change.
- Do not select a full profile schema solely from repository type; consider the
  affected facets and tier.
- Keep durable specs and ephemeral orchestration packets separate.
- Project instructions override generic tracker, schema, tool, and path advice.
