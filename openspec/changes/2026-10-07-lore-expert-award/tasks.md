# Tasks

## 1. Backend

- [x] 1.1 Add locale-aware one-time award bootstrap; verify fresh databases, upgrades, preserved rows, deletion, edits, and interrupted initialization with store tests.

## 2. Frontend

- [x] 2.1 Add shared open-book emblem and verify text-free rendering with surface tests.

## 3. Docs

- [x] 3.1 Add Russian changelog entry and synchronize the operator-rewards spec; validate the OpenSpec change.

## 4. Verification

- [x] 4.1 Run `go test ./...`, `golangci-lint run ./...`, `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; resolve relevant failures.
- [x] 4.2 Run relevant `npm run test:e2e -- --project=chromium` scenarios for grant, picker, and alert presentation; verify 50 XP, history, diagnostics, and admin/OBS behavior.
- [x] 4.3 Review the complete diff and record validation evidence for the PR.
