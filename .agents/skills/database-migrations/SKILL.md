---
name: database-migrations
description: How to organize database schema migrations safely — ordering, idempotency, data backfill before constraints, and recovering from missing or out-of-order migrations. Use when adding or repairing schema migrations with any migration tool.
---

# Database schema migrations

Schema migrations are an append-only, ordered history shared across every
environment. Most migration pain comes from breaking that contract — editing
applied migrations, ordering conflicts, or adding a constraint the existing
data violates.

## Principles

- **Immutable once applied.** Never edit, rename, or renumber a migration that
  any environment has already run — it desyncs version history between
  environments and breaks the next deploy.
- **Idempotent where feasible.** Use guards (`ADD COLUMN IF NOT EXISTS`,
  `DROP CONSTRAINT IF EXISTS`, conditional inserts) so a re-run or a
  partially-applied migration is safe to apply again.
- **Backfill before constraining.** If existing rows would violate a new
  `UNIQUE`/`NOT NULL`/`CHECK`, consolidate or fill the data in the same
  migration *before* adding the constraint or index.
- **Keep multi-statement blocks intact.** Tools that split SQL on semicolons
  need explicit block markers (e.g. Goose `StatementBegin`/`StatementEnd`)
  around `DO $$ ... $$` blocks and functions.
- **Test against production-like version state.** Reproduce the target
  environment's applied-version state in a scratch database before shipping.
- **Provide a down/rollback** when the tool supports it.

## Ordering & versioning pitfalls

- **No duplicate version prefixes.** Two migrations with the same version
  number is a deploy-time failure — add a CI check that rejects duplicates.
- **Out-of-order / missing migrations.** When one environment skipped a lower
  version that was added later, the tool may refuse to continue. Most tools
  offer an out-of-order apply mode (Goose `WithAllowMissing()`, Flyway
  `outOfOrder=true`) — enable it deliberately instead of renumbering history.

## Runbook: recover from missing or out-of-order migrations

Symptom: the tool reports missing migrations *before* the current version,
usually after migrations were renamed/renumbered or an environment deployed at
a different point in history.

1. **Enable out-of-order apply** in the migration bootstrap so the skipped
   lower version can still be applied.
2. **Make the gap migration idempotent** (see Principles) so it is safe whether
   or not parts already ran.
3. **Consolidate violating data first** if the gap migration adds a unique
   constraint — do it in a single pre-step before the index/constraint.
4. **Document the repair** in a short runbook next to the migrations: symptom
   log line, root cause (version gap / rename / duplicate prefix), preferred
   deploy fix, and an idempotent manual SQL fallback.
5. **Simulate locally** by recreating the broken environment's version state in
   a test database before shipping the fix.

## Prevention

- CI check for duplicate version prefixes
- Never rename or renumber an already-applied migration
- Reproduce production version state before any migration repair
