# QA Evidence — 2026-09-12

## Automated checks

- `go test ./...` — passed.
- `go test -race -count=1 ./internal/store ./internal/api ./internal/bus ./internal/bootstrap` — passed; store 191.917 s, API 168.347 s.
- `golangci-lint run ./...` — passed, 0 issues.
- `go build ./...` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 183 tests; RU/EN parity reports 911 keys.
- `openspec validate viewer-ranks-and-achievements --strict`, `openspec validate --specs`, and `git diff --check` — passed.

Focused store coverage includes cross-platform overlapping and disjoint session history, exact merged totals, preservation of participation rows, one merge audit, source-row removal, and a fault injected before commit proving rollback.

## Browser smoke

Headless Chromium against a temporary headless server at `127.0.0.1:18778`:

- Audience → Progression loaded five seeded levels and eight seeded achievements; reconciliation status was `idle`.
- At 1440×900, the progression panel was independently scrollable and no page-level horizontal overflow occurred.
- At 390×844, no horizontal overflow occurred.
- An unsaved alert draft with `sound=bell.ogg` and `sound_volume=31` was sent unchanged to `POST /api/progression/preview`; no persistence action was made.
- Browser console produced no errors during these scenarios.

The temporary config/database/log directory and server process were removed after the smoke.

## Platform matrix and explicit skips

Ubuntu/Chromium automated and browser cells above are complete. Packaged Wails/WebView2, macOS WebKit, Windows/Linux OBS CEF, signing/notarization, installer, and real connector OAuth were not available in this Linux CI workspace and remain explicit release-environment checks; no release artifact was claimed as tested or published.

## Known non-release issue

`npm audit` reports five high-severity development dependency advisories in the existing BrowserSync dependency chain. This change did not introduce or update that chain; it requires a separately scoped dependency upgrade and browser-regression pass.
