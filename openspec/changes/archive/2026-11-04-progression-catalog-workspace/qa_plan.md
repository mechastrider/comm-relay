# QA Plan

## Platform Matrix

Linux Chromium with desktop, narrow and short viewports; relevant browser-tagged scenarios on Firefox/WebKit if available. Packaged Wails smoke is a separate manual limit.

## Behavior and UI Scenarios

P0: switch catalog, select/create/edit/save both kinds, preserve baseline protection and revision confirmation, cancel/confirm dirty record/catalog/back/route transitions, retain filters and selection. P0: open Alerts from top, edit/save, dirty Escape/close/backdrop cancel/discard, and verify footer containment in short windows. P1: list summaries, global-disabled hints, local errors/retry, isolated test/reconciliation feedback, compact focus and keyboard list navigation. Seed isolated runtime fixtures, never production config.

## Filesystem / IPC / Permission / Lifecycle Scenarios

Not applicable: no boundary changes.

## Persistence Migration / Corruption / Recovery

No migration. Existing CRUD integration regressions cover persistence.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Build embedded server after admin build. No package changes; actual Wails/Windows smoke requires a supported desktop host.

## Automated Commands / Manual Setup / Fixtures

npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e -- --project=chromium --grep 'progression|Progression'; go test ./internal/api; golangci-lint run ./...

## Evidence and Explicit Skips

Completed 2026-11-04:

- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`: passed. Unit tests: 9 files / 34 tests; static-surface suites passed.
- `GOCACHE=/tmp/comm-relay-go-cache npm run test:e2e -- --project=chromium --grep 'progression|Progression|achievement subject|emblem.*persist|emblem.*editor'`: 15 passed, including existing CRUD, baseline protection, revision confirmation, unavailable subject retry and emblem persistence regressions.
- `GOCACHE=/tmp/comm-relay-go-cache go test ./internal/api`: passed. `GOCACHE=/tmp/comm-relay-go-cache GOLANGCI_LINT_CACHE=/tmp/comm-relay-lint-cache golangci-lint run ./...`: 0 issues. Cache overrides were required by read-only default caches; local server/browser tests required sandbox escalation.
- `openspec validate --specs`: 29 passed, 0 failed; `openspec validate progression-catalog-workspace --strict`: passed.
- Chromium geometry assertions passed at widths 1440, 1100, 1024, 1023, 520 and 390, with short 600/700px heights and Russian labels. A 45-row catalog retained accessible actions while scrolling. Manual Chromium interaction/screenshot review covered 1440×900 alerts and 390×600 editor scrolling.
- Initial regressions found and fixed: nested-dialog discard focus restoration and compact-shell document scrolling hiding editor actions. Added local sticky chrome with measured offsets and focus scroll margins. Invalid sound test fixture corrected from unsupported `bell` to supported `chime`.
- Firefox/WebKit browser-tagged scenarios could not start: Firefox executable missing; WebKit missing `libgstcodecparsers-1.0.so.0`. These are environment limitations, not passed checks.
- Packaged Wails/Windows and actual OBS smoke not run in this Linux browser environment. No OS integration, persistence or OBS surface behavior changed.
- Final diff review: no backend/API changes; existing field payloads and guards preserved. New strings exist in both locales; existing release history preserved. No critical findings remain.
