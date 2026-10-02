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

## Follow-up: tooltip regression
The user reported unreadable letter-by-letter wrapping on Recap and fragmented words on New stream. Shared absolute tooltips inherited `overflow-wrap: anywhere` from action buttons and had only a max-width, allowing their intrinsic width to collapse. Added content width and isolated word-breaking rules. A rendered test then exposed right-edge overflow; Live and Audience toolbar hints now align inward at all viewport widths.

The previous locale loop set only localStorage, which was overwritten by the server configuration. The regression suite now overrides the fixture configuration response, and tooltip cases explicitly assert the resulting document language. Earlier RU/EN claims must be interpreted with this correction; the follow-up run verifies the actual configured languages.

The first verification attempt exhausted the temporary disk (ENOSPC / browser resource failures). Removed only regenerable caches from this session and reran with one browser worker. Initial word assertions were also corrected to allow natural hyphen boundaries rather than treating a hyphenated phrase as an indivisible word.

Results: all 18 focused tooltip cases passed on the final CSS (6 Chromium cases in a separate run, 12 Firefox/WebKit cases together), covering Recap plus New stream on Live and Audience in RU/EN at 1440, 1100 and 390px. The 24 existing geometry/form checks also passed across the three browsers. The combined earlier run had one transient WebKit access-control error during navigation; the final focused WebKit run passed, and the test no longer performs redundant navigation before reload. Chromium's shared cached executable disappeared during verification; reinstalled it in a task-local directory and reran all six cases successfully. Frontend typecheck/lint, 39 surface tests, 21 unit tests and production build passed. Targeted `go test -p 1 ./internal/api` passed using the available Go cache after disk cleanup. Native Wails/OBS host checks remain unavailable.

## Follow-up: Studio tooltip clipping
Reproduced the reported preset/options hints in Russian with Studio All settings at 1440x900, 1100x700 and 390x844. Screenshots and ancestor rectangles demonstrated horizontal clipping by both the preview column and nested preview panel, and by the inspector column. The tooltip's own text height was sufficient. Removed outer clipping while retaining inner preview-stage containment and inspector-body scrolling; aligned preset hints and narrow preview-options hints inward.

Added `studio-tooltip.spec.ts` covering 1440x900, 1100x700, 520x600 and 390x844, preset create/rename/duplicate plus preview options, pointer/keyboard visibility, tooltip text height, viewport and clipping-ancestor bounds, actual inspector scrolling and preview-stage overflow. Inspected local screenshots in `/tmp`; no screenshots are added to Git. Initial tests navigated to a lazy route and immediately reloaded it, sometimes causing aborted-module errors in Firefox/WebKit; replaced this with a single full navigation before the final rerun.

Verification: all 12 tooltip/containment scenarios passed across Chromium, Firefox and WebKit. One WebKit case initially checked the first-visit dialog before it appeared; the test now waits for the dialog action, and the affected case passed on rerun. Chromium tooltip checks and Studio publish/preset regression passed. The publish/preset regression also passed in Firefox and WebKit. Frontend typecheck/lint, 39 surface tests, 21 unit tests, production build, `go test ./internal/api` and `golangci-lint run ./...` passed (0 lint issues). Strict OpenSpec validation and diff whitespace checks passed. Native Wails/Windows and real OBS host smoke remain unavailable.
