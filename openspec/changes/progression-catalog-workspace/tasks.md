# Implementation Slices

## Frontend: focused progression workspace

- [x] 1.1 Build catalog switch, list/editor panels, summaries, grouped fields and compact list/back flow.
- [x] 1.2 Add guarded alert-settings dialog, scoped feedback, global-disabled hints and separate reconciliation action.
- [x] 1.3 Cover dirty transitions, CRUD, dialog dismissal and responsive keyboard/layout behavior with browser regressions.

## Backend

No backend changes; existing endpoints remain unchanged.

## Docs

- [x] 2.1 Update Russian Unreleased changelog and sync canonical spec.

## Verification

- [x] Q.1 Run npm ci, npm run typecheck, npm run lint, npm test, npm run build, npm run test:e2e -- --project=chromium --grep 'progression|Progression', go test ./internal/api, golangci-lint run ./...; record results in qa_plan.md.
- [x] R.1 Review final diff and resolve regressions.
- [x] D.1 Verify embedded server build and document packaged smoke limitations.
