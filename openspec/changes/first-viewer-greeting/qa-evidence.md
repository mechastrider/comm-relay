# QA evidence — first-viewer-greeting

Date: 2026-09-11 (Linux CI workspace)

## Automated evidence

- `go test ./internal/store ./internal/api ./internal/observability -count=1` — passed.
- `go test -race ./internal/store ./internal/api -count=1` — passed (`store`: 134.560s; `api`: 131.174s).
- `go test ./... -count=1` — passed.
- Migration/bootstrap/qualification coverage includes fresh localized defaults, populated v15 upgrade backfill, down/up compatibility, restart, concurrent first lines, canonical cross-platform merge, exclusion consumption, and command classification — passed.
- Greeting API coverage includes fixed catalog order, update validation, preview draft persistence isolation, and debug-versus-production WebSocket audience isolation — passed.
- `node --test web/alert/alert-render.test.js web/alert/alert-scheduler.test.js` — passed.
- `npm ci`, `npm run lint`, and `npm run test:i18n` — passed.
- Focused admin greeting markup, alert rendering, and alert scheduler tests — passed.
- Chromium browser regression at 1440×900 — passed: a delayed greeting save blocks list selection without a discard dialog; after save, both catalog headers measure 54 px.
- Chromium browser regression at 1440×900 — passed: Greetings and Settings use the shared styled discard dialog; mouse and keyboard cancel preserve the draft and restore focus, confirm continues section navigation or Reset, and no native browser dialog opens.
- ESLint negative probes — passed: `window.confirm`, `globalThis.alert`, and global `prompt` in `web/admin` each fail `no-restricted-properties` or `no-restricted-globals`.
- `golangci-lint run ./...` — passed.
- `go build ./cmd/comm-relay-server` — passed.
- `openspec validate first-viewer-greeting --strict` — passed.
- `go build ./...` — passed; this verifies the embedded migration and static web assets compile into the supported headless build.

## Explicit environment skips

- No Windows 11 Wails/OBS runner is available.
- No macOS universal Wails/OBS runner is available.
- No Linux desktop WebKit/Wails or OBS runtime is available in this headless workspace.
- Browser visual checks at 375/768/1024/1440 px and a screen-reader spot check require an interactive browser/OBS host. Static markup, keyboard semantics, localization parity, and alert rendering/scheduling are covered by automated checks above.
- Consequently, the Windows/macOS/Linux Wails package and visual matrix remains an explicit release-environment follow-up; no signing, packaging, artifact-layout, or release operation was performed here.
- Signing, notarization, upload, release, installer, updater, notification, tray, and cloud checks are out of scope for this change.
