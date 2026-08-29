# Review checklist (cursor-orchestration)

Convention and defect pass after implementation and browser QA. Launch a
**fresh** `Task` with the review model selected by `model-routing.md`. Primary
input is `git diff` vs base plus the change artifacts, task Scope/Blocked, and
project instructions.

This is an independent implementation-diff review. It supplements the
universal OpenSpec validation and project verification available through
`.agents`; it does not replace either.

## Review order

1. **Behavior and scope**
   - Acceptance criteria and delta specs are implemented.
   - No promised behavior was silently narrowed, deferred, or replaced.
   - Scope/Blocked boundaries and explicit non-goals were respected.

2. **Contracts and compatibility**
   - Public APIs, HTTP/RPC/event/IPC shapes, persistence, migrations, and
     serialization match the relevant artifacts.
   - Backward compatibility, deprecations, rollout order, and rollback are
     handled where required.

3. **Correctness and failure behavior**
   - Validation, authorization, error mapping, retries, cancellation,
     transactions, concurrency, and partial failures follow project policy.
   - Delete/update helpers propagate errors; missing data is not reported as
     success unless specified.

4. **Tests and evidence**
   - Tests exercise behavior and boundaries rather than only implementation
     details.
   - Required negative, role/tenant, migration, platform, offline, or
     compatibility cases are present.
   - QA evidence corresponds to the planned scenarios.

5. **Project conventions**
   - Apply the skills and rules named by `AGENTS.md`, OpenSpec config, and the
     task artifacts.
   - Avoid drive-by refactors and invented conventions.

## Go + web convention overlay

When the project matches the Go fullstack layout used by the original Cursor
workflow, preserve these additional checks. Paths are relative to the
deployable root from OpenSpec context.

**API tests** (`serverapp/.../api/apitest/`):

- Blocker: PostgreSQL test suite, integration build tag, or SQL/repository
  seeding inside handler tests.
- Expected: test container plus mocked domain repository. Tenant/SQL isolation
  belongs in adapter integration tests.

**Use cases:**

- Blocker: several independent Command/Query scenarios collapsed into one
  oversized source file.
- Check transactions/locking, concurrent find+count where project conventions
  require it, domain validation, not-found mapping, and repository error
  propagation.
- Expected project layout: one scenario/action per use-case file when the
  repository follows that convention.

**API handlers:**

- Request/response mapping, status codes, error mapping, validated session,
  RBAC/tenant authorization.
- Blocker: more than one unrelated handler type in a file when project
  conventions require action-per-file.
- Missing session uses the project unauthorized helper, not an ad-hoc error.

**Repositories/adapters:**

- Query construction, domain mapping, explicit not-found behavior, indexes and
  aggregation semantics.
- Blocker: port types, SQL adapter, temporary stub, and tests collapsed into one
  package when the project separates those layers.
- Temporary DI stubs live in the project stub area and are removed when the
  production adapter lands.

**Frontend:**

- API clients, forms, accessibility, loading/error/success, and consistency
  with this repository's design system.
- Related-entity pickers use server search/pagination and recoverable loading;
  lists resolve visible foreign keys to human-readable labels rather than
  silently showing raw ids.
- Creating a record is not blocked by eagerly loading an entire reference
  catalog unless the UI contract explicitly requires it.

## Report

Return findings grouped as:

- **CRITICAL** — blocks acceptance or release;
- **IMPORTANT** — should be fixed in this change;
- **RECOMMENDATION** — useful follow-up outside current scope;
- **GOOD** — notable strengths worth preserving.

Each finding names evidence and a concrete correction. Do not edit code during
this review task. The parent batches accepted findings into a bounded correction
pass and owns final acceptance.
