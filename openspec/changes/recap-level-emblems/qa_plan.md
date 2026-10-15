# QA Plan
## Platform Matrix
Linux Chromium integration for shared browser/OBS UI; desktop native integration unchanged.
## Behavior and UI Scenarios
P0: saved emblem/title survive later XP and level edits; legacy payload has no badge; current all-time includes emblem. P1: admin, OBS and PNG render shared accessible badge; names and metrics remain readable.
## Filesystem / IPC / Permission / Lifecycle Scenarios
No new adapters; existing tests remain applicable.
## Persistence Migration / Corruption / Recovery
Test valid/invalid/absent emblems and stored replay.
## Install / Upgrade / Downgrade / Packaged-App Smoke
No installer changes. Build frontend before Go checks. Native desktop smoke is outside this Linux browser check; report limitation.
## Automated Commands / Manual Setup / Fixtures
npm ci; npm run typecheck; npm run lint; npm test; npm run build; targeted Playwright recap tests; go test for recap/store/api; golangci-lint run ./...; openspec validate.
## Evidence and Explicit Skips
Record actual command results after implementation. No concurrency behavior changes; no new race scenario required.

### Results
- npm ci: passed (required network-enabled execution).
- npm run typecheck, npm run lint: passed.
- npm test: 40 surface test files and 34 React/unit tests passed.
- npm run build and Go server build through test:e2e: passed.
- go test ./internal/recap ./internal/store ./internal/api: passed.
- golangci-lint run ./...: 0 issues.
- Chromium recap-level-emblems and recap PNG exporter scenarios: 3 passed; five theme layouts checked. Initial browser run could not launch because Chromium was missing; installed it and reran successfully.
- openspec validate recap-level-emblems --strict and git diff --check: passed.
- Reviewed the default-theme screenshot and final data/renderer diff; no blocking findings.
- Native Wails/platform smoke and Firefox/WebKit were not run; OS adapters are unchanged. Browser PNG/native-save cancellation mock passed, but is not native-shell evidence.
