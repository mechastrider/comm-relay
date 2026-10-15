# Implementation Slices
## Slice: Live events journal
> **Outcome**: Operators review durable current-stream actions separately from chat.
> **Acceptance**: Store/API tests, frontend tests and Chromium Live events regression.
> **Skills**: comm-relay-backend-golang, golang-tests, api-conventions, database-migrations, web-constrained-layout, changelog, interactive-research.
> **Scope**: store, API and React Live; Russian/English catalogs.
> **Allowed fallout**: migration, tests, docs and backlog.
> **Blocked**: dock implementation, unrelated features, releases.
- [x] 1.1 Implement durable feed projection, social attribution and level history with bounded API and tests.
- [x] 1.2 Implement accessible Live Events UI, filters, polling and stable reading with regression tests.
- [x] 1.3 Sync canonical specs, update CHANGELOG and record deferred dock idea.
## Gate: qa
- [x] Q.1 Execute qa_plan.md and record evidence/limitations.
## Gate: review
- [x] R.1 Review final diff and resolve findings.
## Gate: distribution-readiness
- [x] D.1 Verify embedded build and PR readiness without publishing a release.
