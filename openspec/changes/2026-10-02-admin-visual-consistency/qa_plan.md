# QA Plan
## Platform Matrix
Development Chromium: RU/EN, 1440x900, 1100x700, 390x844, keyboard/pointer. Existing Playwright Chromium/Firefox/WebKit suite where installed. Native Wails/OBS release-host smoke recorded separately, not inferred from browser.
## Behavior and UI Scenarios
P0: catalogs retain create/select/edit/save/preview/delete/dirty guard and conditional media fields. P0: settings save, Studio publish and dialogs retain behavior. P1: ordinary button/label/icon geometry 38px/12px, narrow >=44px; equal geometry across color variants. P1: sections are 1px neutral, labels and chips semantic. P1: headers and footers wrap, fields scroll and last actions remain reachable. P1: disabled/hover/focus/error states and RU/EN labels. P1: no document horizontal overflow across sample routes.
## Filesystem / IPC / Permission / Lifecycle Scenarios
Unchanged; existing regressions cover uploads and shell boundaries.
## Persistence Migration / Corruption / Recovery
Not applicable: no data changes.
## Install / Upgrade / Downgrade / Packaged-App Smoke
No installer/migration changes. Build frontend before Go embeds; native smoke unavailable must remain explicitly skipped.
## Automated Commands / Manual Setup / Fixtures
npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; go test ./...; golangci-lint run ./... . Use existing disposable server fixtures and meaningful Playwright assertions for geometry/groups and interactions. Visual screenshots stay ignored under var/. No real streamer DB.
## Evidence and Explicit Skips
Verified on Linux, 2026-10-02:

- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed. Unit coverage: 39 surface tests and 21 Vitest tests in 7 files.
- Full Playwright suite: Chromium 45 passed; Firefox and WebKit 78 passed together. Browser execution required local socket permissions; WebKit used the available dependencies under `/tmp/comm-relay-webkit-deps`.
- Existing 24 Chromium screenshot baselines were updated for the intended styling changes. A separate no-update visual run passed all 6 visual tests. Final parity baselines were regenerated after restoring round viewer portraits and verified separately.
- `GOCACHE=/tmp/comm-relay-ux-gocache go test ./...` passed after the frontend build. `golangci-lint run ./...` passed with 0 issues using writable temporary caches. No Go logic or concurrency changed.
- New rendered checks cover RU/EN across 1440x900, 1100x700, and 390x844: ten admin routes, common action geometry, icon squares, document overflow, catalog section borders/legends, primary action color, and access to final fields. Interaction checks cover conditional command sections/drafts, chip hover/keyboard focus, and greeting validation borders/focus.
- Manual browser inspection confirmed the catalog grouping, readable appearance controls, scrolling and responsive action geometry. Evidence remains local under ignored `var/`; original audit PNGs are ignored separately. Checked-in Playwright baselines intentionally remain versioned.
- Fresh review found missing field wrappers in the greeting text/appearance groups that affected invalid borders and radio labels. Restored wrappers and added the validation regression. Reviewer confirmed both findings resolved. Final diff review also caught and restored round viewer portraits after an overly broad radius replacement.
- Canonical admin design-system spec synchronized; OpenSpec strict change validation and all 27 canonical spec validations passed. `git diff --check` passed.

Explicit skips: native Wails/Windows and actual OBS host smoke were not run in this Linux browser environment. They remain release-host checks, not inferred successes. No installer, signing, publication, or migration work was required. Frontend build and Go embed/test readiness were verified. Existing functional regressions cover save, upload, drafts, dialogs, catalog operations, and Studio publishing.
