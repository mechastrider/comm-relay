# QA Plan
## Platform Matrix
Linux automated Go/Chromium checks. Native Windows/macOS Wails smoke unavailable in Linux; report explicitly. Existing UI components and HTTP avoid native adapters.
## Behavior and UI Scenarios
P0: successful like/buff once, commands and awards persisted, activity/rejected events absent, achievements and level increases visible. P0: session switch, pagination without duplicates, invalid cursor rejection. P1: filters, scroll freeze/new rows, long translated labels, empty/error/retry and resume.
## Filesystem / IPC / Permission / Lifecycle Scenarios
No new permissions or IPC. Existing store reopen tests cover durable recovery.
## Persistence Migration / Corruption / Recovery
Migration on existing facts preserves them with legacy defaults; rollback of failed transaction cannot leak feed metadata or level events. Query failures logged; UI retains data.
## Install / Upgrade / Downgrade / Packaged-App Smoke
Build embedded admin and Go server. Native packaged app unavailable here; no native code changes.
## Automated Commands / Manual Setup / Fixtures
npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e -- --project=chromium --grep "live events"; go test ./...; golangci-lint run ./... . Use deterministic store/API fixtures and isolated E2E server.
## Evidence and Explicit Skips
Record results and unavailable checks after execution. No overlay implementation changes; run existing surface tests and relevant admin regression.

## Execution Results — 2026-10-15
- `npm ci`: passed (241 packages; lockfile unchanged).
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm test`: 40 surface tests and 34 unit tests passed, including four journal state/cancellation tests.
- `go test ./...`: passed. Focused store/API/migration tests rerun after final test/import edits: passed.
- `golangci-lint run ./...`: 0 issues.
- Chromium: all three journal scenarios passed (real award + restart + filters, Russian 1280px and 390px reading/recovery). Five existing live/chat/keyboard/locale scenarios also passed.
- Narrow-screen verification found an unbounded journal under the mobile shell; an explicit journal height now preserves its independent scroll region. Successful screenshots inspected at 1280px and 390px.
- OpenSpec change strict validation and all 29 canonical specs passed. `git diff --check` passed.
- Existing award/command error logging and pipeline counters remain in their original transaction callers; the new read endpoint logs unexpected failures. No new bus or WebSocket delivery path.
- Native Windows/macOS Wails runtime smoke was not available on this Linux host. The real-server Chromium checks use the built embedded admin; no native bridge or packaging code changed.
- Environment: Go/lint caches and Chromium installed under temporary directories; network/local-server checks required sandbox escalation. Initial missing-browser and test-fixture setup failures were resolved before final verification.
