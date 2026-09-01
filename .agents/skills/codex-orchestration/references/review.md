# Independent Sol review

Review happens after implementation and profile QA in a fresh, read-only Sol
context. It supplements OpenSpec validation and project verification; it does
not replace either.

## Inputs

- pre-run baseline and current status;
- exact run-owned tracked and untracked paths with complete diff/content;
- change brief, scope, non-goals, assumptions, and open decisions;
- proposal, specs, design, contracts, plans, and tasks resolved by OpenSpec;
- authoritative requirements and relevant project instructions;
- acceptance and profile-QA evidence.

Do not review pre-existing user changes as if this run created them. Do not edit
code, artifacts, tasks, main specs, or archive state.

## Review order

1. **Promise match** — every acceptance criterion and normative scenario is
   implemented; no behavior was silently narrowed, deferred, or replaced.
2. **Scope** — no unrelated feature or refactor; necessary fallout, tests, and
   fixtures are included.
3. **Contracts and compatibility** — public API, serialization, migrations,
   HTTP/RPC/events/IPC, persistence, UI states, platform behavior, rollout, and
   rollback match the relevant artifacts.
4. **Correctness and failure behavior** — validation, authorization, isolation,
   error mapping, transactions, cancellation, retry, concurrency, offline and
   partial failures follow project policy. Delete/update helpers propagate
   errors; missing data is not success unless specified.
5. **Tests and evidence** — tests prove behavior at the right boundary;
   negative, role/tenant, migration, compatibility, platform, lifecycle, and
   recovery cases are present where the affected facets require them.
6. **Project conventions** — apply the skills and rules named by project
   instructions and OpenSpec context; avoid invented conventions and fragile
   coupling.

## Profile lens

| Profile | Additional focus |
|---|---|
| library | Public API compatibility, examples, supported versions, packaging, release contract |
| service | Authorization, data isolation, migrations, transactions, integration contracts, reliability and observability |
| web | Loading/empty/error/success states, accessibility, responsive behavior, client/server contracts, browser evidence |
| desktop | IPC and filesystem boundaries, OS integration, install/upgrade, packaged runtime behavior |
| mobile | Permissions, lifecycle/background/offline behavior, sync conflicts, deep links, upgrade behavior |
| mixed | Stable contracts between deployables and coherent cross-component rollout order |

Apply stack-specific overlays only when the repository declares them. For
example, a project may require action-per-file handlers, mocked handler tests,
tenant-scoped adapters, a particular server-state layer, or specific
accessibility tooling. Treat those as project evidence, not universal rules.

## Evidence rules

- Acceptance commands correspond to changed behavior and ran from the correct
  root.
- Tests would fail for the missing behavior or defect they claim to cover.
- Role/tenant negative tests use genuinely distinct identities or tenants.
- QA evidence maps to the planned scenarios and identifies unsupported matrix
  cells or tooling gaps.
- Durable tasks are checked only when their complete behavior has passed.
- Active delta specs and requirements documentation match the implementation.

## Report

Return findings first, ordered by severity:

```text
CRITICAL
- <file:line or artifact/behavior> <defect, impact, and concrete correction>

HIGH
- ...

MEDIUM
- ...

LOW
- ...

Evidence gaps
- ...

GOOD
- <strength worth preserving>

Verdict: PASS | FAIL
CRITICAL: <count>
HIGH: <count>
Blocking evidence gaps: <count>
```

Use `PASS` only when `CRITICAL=0`, `HIGH=0`, and no evidence gap blocks a
promised behavior, authorization or isolation claim, migration/file-safety
claim, compatibility promise, supported-platform promise, or happy path. Do
not inflate style preferences or unrelated refactors to HIGH. If there are no
findings, say so and identify residual non-blocking limitations.
