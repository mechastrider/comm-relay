# Browser / Manual E2E Report

Copy to `openspec/changes/<slug>/evidence/browser-report.md` and fill it before
checking the browser/QA gate in `tasks.md`.

## Metadata

| Field | Value |
|-------|-------|
| Change slug | |
| Run date/time and timezone | |
| Executor | |
| Result | Pass / Partial / Fail |

## Environment

- Branch / commit / dirty baseline:
- Runtime environment source of truth:
- Backend/frontend URLs actually used:
- Database/dependency probes:
- Stack start commands and actual endpoints:
- Reused processes/sidecars that this agent does not own:

Do not paste secrets. Stop only processes this agent started.

## Roles, Fixtures, and Scenarios

For every planned role/scenario record steps, expected behavior, actual result,
and evidence.

### Scenario: `<id and name>`

- Role / fixture:
- Steps:
- Expected:
- Actual:
- Result: OK / mismatch / blocked
- Evidence:

## Delta-Spec and UI-Contract Coverage

| Spec/UI reference | Scenario | Result | Evidence |
|-------------------|----------|--------|----------|
| … | … | … | … |

## Responsive / Accessibility / Failure States

- Viewports/input methods:
- Keyboard/focus/semantics:
- Slow/offline/error/retry:

## P0 / P1

| ID | Severity | Symptom / gap | Status | Evidence / follow-up |
|----|----------|---------------|--------|----------------------|
| … | P0/P1 | … | open/fixed/skipped | … |

## Stack Shutdown

List processes started and stopped by this agent and reused processes left
running.
