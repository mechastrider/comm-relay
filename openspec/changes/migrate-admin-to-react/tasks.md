# Implementation Slices

## Frontend: baseline and test infrastructure
- [x] 1.1 Inventory every admin capability against current code/specs and establish baseline checks.
- [x] 1.2 Add isolated Playwright harness and capture current UI/workflow characterization before replacement.

## Frontend: application foundation
- [x] 2.1 Add React/TypeScript/Vite, strict typechecking, component tests and lint guards.
- [x] 2.2 Implement shell, hash-route compatibility, shared accessible controls and localization.
- [x] 2.3 Implement typed API, separated server/draft state and managed live subscriptions.

## Frontend: Settings and About
- [x] 3.1 Port platform/network settings, OAuth, validation and per-section save/reset/draft guards.
- [x] 3.2 Port data/application/diagnostics settings and About with behavior tests.

## Frontend: Audience
- [x] 4.1 Port viewer directory, detail, merge, portrait, visibility and award flows.
- [x] 4.2 Port command and award catalogs, templates and media.
- [x] 4.3 Port greetings, achievements, levels and progression settings.
- [x] 4.4 Port reward history and session archive with behavior tests.

## Frontend: Studio
- [x] 5.1 Port surface selection, preview, all appearance controls and draft publication.
- [x] 5.2 Port preset CRUD/activation, media and OBS onboarding/URLs.
- [x] 5.3 Preserve dedicated debug/test surfaces and API without restoring the intentionally absent Studio panel (OQ-002); port recap inspector with behavior tests.

## Frontend: Live
- [x] 6.1 Port rich messages, sound, deletion/rewards and command outcomes.
- [x] 6.2 Port leaderboard/statistics, contracts, active preset and new-stream controls.
- [x] 6.3 Port recaps, history, share image and centralized desktop save with behavior tests.

## Backend and distribution
- [x] 7.1 Serve/embed compiled admin, preserve disk mode, test missing build and surface routes.
- [x] 7.2 Integrate frontend builds into dev, Go/Wails, CI and release workflows.

## Docs and cleanup
- [x] 8.1 Remove replaced legacy admin controllers and migrate obsolete markup tests without losing behavior coverage.
- [x] 8.2 Update development/agent instructions and synchronize implemented OpenSpec contracts.

## Verification
- [x] Q.1 Run npm run typecheck, npm run lint, npm test, npm run build.
- [x] Q.2 Run npm run test:e2e and npm run test:e2e:visual; review screenshots, traces and all available browser projects.
- [x] Q.3 Run go build ./..., go test ./... -race -count=1 and golangci-lint run ./....
- [x] Q.4 Verify available native runtime and adjacent OBS/dock surfaces; record explicit unavailable checks.
- [x] R.1 Review final diff and feature matrix; resolve critical defects and rerun affected checks.
- [x] D.1 Validate distribution readiness without publishing; record platform acceptance limits in qa-results.md and leave release publishing/archival separate.
