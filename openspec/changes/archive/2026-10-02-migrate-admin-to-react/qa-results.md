# Migration verification — 2026-10-02

## Delivered implementation

The root admin is now React 19 / TypeScript / Vite with a hash router. Live, Audience (viewers, progression, greetings, commands, awards, reward history, archive), Studio, Settings and About use React-owned DOM/state. Legacy admin controllers and markup-dependent tests were removed; useful pure models/tests and the original CSS were retained. Workspace modules load in separate production chunks. No production API, config schema or database schema changed.

The Go binary embeds `web/admin/dist`, never the admin source/tests. Disk mode reads the same compiled assets. Task, Wails, CI and release builds run the frontend build first. Ready-made executables need no Node runtime. Build/dev instructions are updated in both languages.

## Evidence matrix

| Check | Result / evidence |
|---|---|
| TypeScript, ESLint, production Vite build | Passed; no oversized-chunk warning |
| Node frontend regression | All 39 test files passed (shared/OBS/dock and migrated pure admin models) |
| Vitest | 20 tests passed: API errors, stale request cancellation, pagination/retry, socket teardown, rich DOM stability, Studio overrides/validation mapping, native bridge source/origin/one-shot behavior |
| Go build | `go build ./...` passed after compiling admin |
| Go race suite | `go test ./... -race -count=1` passed across all packages; API ~357 s, SQLite store ~509 s |
| Go lint | `golangci-lint run ./...`: 0 issues |
| Post-shell-change Go checks | Compiled static-root/asset tests and Wails-tagged desktop/bridge packages passed; lint again reported 0 issues |
| Browser integration | 78/78 passed in Chromium, Firefox and WebKit (3.3 minutes), including all visual cases; no skipped tests |
| Visual parity | 24 original-admin Chromium screenshots: five workspaces at three sizes, populated viewer directory, viewer detail and OBS setup at three sizes. No baseline updates used to hide migration differences |
| Disk mode | 10 Chromium route/workflow tests passed with `COMM_RELAY_E2E_DISK=1` |
| Vite development | Source modules loaded; Settings mutation persisted through API proxy/reload; OBS proxy loaded with transparent background |
| Wails build | Final full Linux `wails build` passed after all shell changes: bindings, dependency installation, frontend build, application compilation and packaging (10.271 s) |
| Native Linux launch | Actual Wails/WebKitGTK window under Xvfb, disposable config/SQLite, isolated desktop entries; React loaded and one production WebSocket connected |
| Native PNG save | Actual GTK Save dialog opened, cancellation returned localized cancelled status, save wrote opaque RGBA PNG 1920×1080. See `evidence/native-save-dialog.png`, `native-cancelled.png`, `native-export.png` |

## Browser coverage and boundaries

Real Go/SQLite integration covers settings save/reload, fresh-config merging, draft guards, catalog CRUD and action-specific payloads/aliases, image upload/clear/abandoned cleanup, greetings, levels and achievement revisions, viewer rename/portrait/visibility/merge, contracts (including deliberate winner settlement), manual recap capture, session restart/archive, Studio publication versus activation, per-surface overrides and OBS URLs. Real server restart verifies WebSocket recovery and repeated navigation verifies a single subscription. Dedicated debug surfaces/API are tested for delivery and absence of live-chat mutations; the intentionally absent Studio debug panel stays absent under OQ-002.

Fault cases explicitly mock the failing HTTP endpoint, OAuth response or incoming chat frames. Chat tests cover hidden-workspace delivery, duplicate IDs, platform-scoped deletion, 20-row limits, hostile text, real award persistence, keyboard reward-menu dismissal and stale-row deletion. Resource/paging unit tests cover late responses and aborts. Browser tests include Russian/English, narrow/desktop sizes, keyboard navigation, unavailable preference storage, scoped request errors/retry, all adjacent OBS/dock routes and transparent overlay backgrounds. PNG browser export and mocked native cancellation run in all three engines; the actual native dialog is separate Linux evidence.

Each browser case starts an isolated real server with temporary config/database, synthetic viewers and disabled connectors. No personal profile or real OAuth authorization was used. Test fixture inserts use a bounded SQLite busy timeout and a transaction to coexist with startup reconciliation. Dynamic client/uptime values are stabilized before visual assertions.

## Findings resolved during verification

- Retained native Wails runtime in a full-window shell; top-level HTTP navigation had discarded `window.go`. PNG calls now use the existing native method through a one-shot channel, target only built-in Wails origins, and validate the exact loopback origin/source frame in the shell. Native failures/cancellation do not trigger browser fallback.
- Preserved explicit automatic alert sizing when a separate font override exists.
- Scoped server validation to the owning preset/surface and expanded/focused the affected control; group reset no longer clears unrelated invalid drafts.
- Kept lifecycle ownership explicit for diagnostics, messages, leaderboards, obsolete reads, media cleanup and asynchronous contract completion.
- Restored intentional product scope after checking canonical OQ-002: standalone debug routes remain; the removed Studio panel is not revived.

## Explicit environment limits

Windows WebView2 and macOS WKWebView, signing/notarization, release publishing, hardware OBS integration, audible speaker output, and real external-platform authorization were not run in this Linux environment. Browser WebKit is not presented as proof of those native platforms. Existing OBS pages were exercised independently through the real runtime; live external chat inputs and OAuth were deterministic fixtures.

WebKit initially lacked host libraries. They were downloaded/extracted locally and linked only into the Playwright browser cache; no sudo/system package install was performed. The final browser command uses the local dependency path. CI installs browser dependencies with Playwright on Ubuntu 22.04.

No build was published or committed by this task. Local Playwright HTML report is in `playwright-report/`; failures retain screenshots/traces. Native evidence is included with this change.
