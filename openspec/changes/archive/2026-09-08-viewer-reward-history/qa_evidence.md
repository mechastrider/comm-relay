# QA Evidence

## Automated gates

- `go test ./internal/store ./internal/api -count=1` — pass (`store` 23.021 s, `api` 24.656 s).
- `go test ./... -race -count=1` — pass with localhost access; `internal/api` 90.338 s and `internal/store` 84.551 s were the longest packages.
- `go build ./...` — pass.
- `golangci-lint run ./...` — pass, `0 issues`, after the QA repair for four `govet` shadow findings.
- `npm ci` — pass.
- `npm test` — pass, 44/44 tests.
- `npm run test:i18n` — pass, 1/1 test.
- `npm run lint` — pass.
- `openspec validate viewer-reward-history --strict` — pass.
- `git diff --check` — pass.

## Review-repair checks

- `go test ./internal/store ./internal/api -count=1` — pass after the schema-14 old-writer compatibility repair (`store` 20.109 s, `api` 23.431 s). The added migration regression upgrades a version-13 fixture, uses the previous binary's legacy insert column list with exact and variable-width UTC timestamps while schema 14 remains installed, reopens through the current store, and verifies name snapshots plus cursor-page order. The existing Down/Up fixture now also verifies compatibility-trigger removal before the column is dropped.
- Parent verification after the complete repair passed `go test ./... -race -count=1` (`internal/api` 94.326 s, `internal/store` 89.640 s), `go build ./...`, and full `golangci-lint run ./...` with `0 issues`.
- `npm test` — pass, 44/44 tests. Added executable controller/rendering coverage proves that Retry after a failed Refresh requests page one even when retained rows have an old cursor, while a failed Load more remains a pagination retry; the panel displays localized history failure copy instead of an internal error message.
- `npm run test:i18n` — pass, 1/1 test. The repair asserts non-empty localized `history.loadFailed` copy in both EN and RU catalogs.
- `npm run lint` — pass.
- `golangci-lint run ./internal/store ./internal/api` — pass, 0 issues (package-scoped because unrelated nested Go files exist under `node_modules`).
- `openspec validate viewer-reward-history --strict` — pass.
- `git diff --check` — pass.

## Persistence, atomicity, and privacy

- Version-13 Up, Down, and re-Up fixtures passed for award-name backfill, deleted-award id fallback, exact-second and mixed-fraction timestamp normalization, and index lifecycle.
- Focused grant tests passed for event-insert rollback, unchanged all-time/session/day XP, no success counter/visibility change, no alert broadcast, duplicate grants, restart durability, and rename/delete snapshot stability.
- Pagination tests passed for award-only global and canonical-viewer scopes, equal timestamps, complete cursor traversal, merge rewrite, hidden-source 404, and invalid input.
- A fresh synthetic server under `/tmp` migrated to schema 14 before serving. `/health`, empty history, first/next global pages, viewer scope, and invalid-limit 400 passed. Public JSON omitted the synthetic source-message id and private chat text.

## Browser evidence

Playwright Chromium 1.62.1 exercised the real admin against a fresh synthetic server with 52 awards.

- EN, 1440×900, device scale 2: semantic Time/Viewer/Reward/XP headers; 50-row first page; signed XP; Refresh busy state; Load more appended two rows; hostile markup-like text stayed literal; wide viewer inspector showed its independent 10-row history.
- RU, 390×700, device scale 2: localized headings and actions; no document-level horizontal overflow; keyboard End selected History; compact viewer sheet kept its Reward history and pagination reachable inside the scrollable body.
- Screenshots were retained outside the repository under `/tmp/comm-relay-browserqa.3fWm3a/`. The temporary server was stopped.

## Distribution readiness and pre-release gaps

- Headless Linux migration/API smoke passed; the ordinary Go build and Linux Wails source build passed.
- No installer layout, artifact naming, dependency, signing, notarization, permission, native IPC, or WebSocket contract changed.
- Packaged Windows 11 Wails, macOS universal Wails, and Linux packaged-WebKit upgrade/downgrade smoke were unavailable on this Linux development host. They remain explicit mandatory pre-release checks under `distribution_plan.md`; no release, signing, upload, or publishing was performed.
