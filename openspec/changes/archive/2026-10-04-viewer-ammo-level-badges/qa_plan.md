# QA Plan

## Platform Matrix

Windows host: Go unit/integration and Edge browser at wide and narrow source sizes. All existing overlay themes, EN/RU strings, keyboard controls and reduced motion. Native OS integration unchanged.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| Display controls | Load missing settings, disable each, save/reload/preview | Default on; explicit off preserved independently | P0 |
| Quotas | Successful like/buff, rejection, exhausted stock, new stream | Independent authoritative counts | P0 |
| Boundaries | Capacities 0,1,8,9,100 | Hidden unavailable; bounded SVG/DOM and exact large values | P0 |
| Identity/recovery | Linked platforms, unknown identity, reconnect, failed lookup | Shared state, no guessed full stocks, recovery | P0 |
| Emblems | Edit/rename level and reopen; invalid id | Selection persists; invalid id rejected | P0 |
| Layout | All themes, compact, narrow, long names/text, award marker | No clipping/overlap; preserved TTL and wrapping | P1 |
| Previews | Sample/debug visuals and unsaved controls | Synthetic status; no production status requests | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

No native IPC, dialogs or permission changes. Page cleanup aborts requests and cancels timers.

## Persistence Migration / Corruption / Recovery

Upgrade v22 fixture, fresh bootstrap, custom levels, preexisting edited starter quotas and omitted update field. Explicit-false preset roundtrip and clone isolation. Failed status request must hide stale status and allow retry.

## Install / Upgrade / Downgrade / Packaged-App Smoke

No installer edits. Compile embedded assets through ordinary build; downgrade mechanics documented in persistence schema. Native desktop manual smoke reported separately if unavailable.

## Automated Commands / Manual Setup / Fixtures

gofmt on touched Go files; go test ./...; golangci-lint run ./...; npm ci; npm run typecheck; npm run lint; npm test; npm run build; relevant npm run test:e2e regression. Use isolated fixture data, never operator database.

## Evidence and Explicit Skips

Record actual command outcomes during implementation. No publishing, signing or platform connector tests unrelated to this change. Race testing needed only if new concurrent Go behavior is introduced.

### Results — 2026-10-04

- Passed: gofmt, complete `go test ./...`, and golangci-lint v2.13.2 with zero issues. The installed linter used an older Go toolchain, so the pinned v2.13.2 CLI was run through `go run` with the project toolchain.
- Passed: `npm ci` using a workspace-local cache; typecheck, ESLint, 204 Node tests and 30 Vitest tests, and Vite production build. Frontend tests require `TZ=UTC` for the existing timezone-sensitive assertions.
- Passed: four new Edge/Playwright scenarios against the embedded Go server with isolated config/SQLite. They cover all five chat themes at 420x900, large magazines, preview isolation, off switches, real status restoration, catalog edits, failure/recovery, Studio publish/reload, emblem selection and exact Audience counts.
- Passed: additional late-award geometry assertion across all five narrow chat themes; text position and width remain stable. Screenshots were inspected, revealing and then confirming the correction of excessive right-side reservation on narrow sources.
- Passed: existing leaderboard rectangle regression across five themes, panel/chips and four rectangles (landscape, square, portrait, narrow banner).
- Passed: strict OpenSpec change and canonical capability validation, plus final diff whitespace review.
- Sandbox limitation: SQLite temporary-directory cleanup failed under sandbox restrictions; rerunning the same Go/browser suites with automatically approved execution resolved it. No operator data was used.
- Not run: native OBS/Wails launch, macOS/Linux package smoke, and Linux pixel-baseline comparison. Existing Linux screenshot baselines were not regenerated from Windows. The changes are validated through Edge geometry checks and inspected screenshots; this is not a claim of pixel-identical output to the previous design.
- No new goroutines or concurrency ownership were introduced; no separate race run. No signing, deployment, or release.

### Header layout follow-up
The user approved moving emblem and both magazines to the right of the header. All five themes passed full-body-width and right-alignment checks at 320, 420, 800 and 1280 pixels; the existing late-award stability check still passed. Avatars now belong to the left name cluster, allowing the complete status group to wrap without a permanent avatar column. All four feature E2E scenarios, typecheck, lint, Node/Vitest tests and embedded build passed again. OBS/Wails manual smoke remains unperformed.


Spacing refinement: removed the hidden award reservation above the header. The five-theme browser matrix passes at 320–1280 px, including zero extra header inset, conditional reward footer placement, and unchanged body width/offset within the card. This supersedes the earlier fixed-height award-row layout; total card height may change when feedback arrives.
