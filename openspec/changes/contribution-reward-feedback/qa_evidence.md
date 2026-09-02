# QA Evidence — contribution-reward-feedback

Date: 2026-09-02
Baseline inspected: `981c4cc0cb6b3f34f1bae025c8cbdb5bda273c4f`
Scope: fresh, read-only QA of the current shared worktree. This file is the
only path written by this QA run.

## Environment

- Linux `5.15.0-181-generic`, `x86_64`; Go `1.26.3`; Node `v24.15.0`; npm
  `11.12.1`; OpenSpec `1.10.0`.
- Installed `golangci-lint` is `2.11.4`; the project guide names `2.12.2`.
  The required lint invocation passed, but this is not a version-identical
  release-tooling run.
- No Chromium/Chrome/Firefox executable and no `wails` executable are
  available in this Linux environment. OBS, a Windows host, a macOS host, and
  packaged application artifacts are not available.
- The worktree was already dirty against the baseline. The QA run preserved
  those changes and created no repository config or database. Disposable smoke
  state was confined to `/tmp/comm-relay-qa.10XDFp`.

## Required automated commands

| Command | Result |
|---|---|
| `npm ci` | PASS after a sandbox retry. The initial sandbox attempt failed because npm could not write `/home/agent/.npm/_logs`; the approved retry completed: 215 packages added and 216 audited. npm reported 5 high-severity dependency audit findings; no audit fix was applied. |
| `npm test` | PASS: 19 tests, 19 passed, 0 failed (alert scheduler/render/lifecycle, opacity resolution/CSS, reward highlight/picker, i18n, Live data, Studio, catalog helpers). |
| `npm run test:i18n` | PASS: locale-parity test passed. |
| `npm run lint` | PASS: `eslint web/` exited 0. |
| `go test ./...` | PASS after the required sandbox retry. The first sandbox run could not write the Go build cache and could not bind `httptest` loopback sockets. The approved rerun exited 0; API, bootstrap, config, store, connectors, emote clients, and all other packages passed. |
| `golangci-lint run ./...` | PASS after a sandbox retry. The first sandbox execution failed while loading packages in the read-only module cache; the approved rerun reported `0 issues`. It used v2.11.4, not the v2.12.2 version named by project guidance. |
| `go build ./...` | PASS. The first sandbox run exited 0 but emitted a read-only Go module-stat-cache warning; approved rerun exited 0 with no output. |
| `openspec validate contribution-reward-feedback --strict` | PASS: `Change 'contribution-reward-feedback' is valid`. |
| `git diff --check` | PASS: exited 0 with no whitespace errors. |

Focused acceptance was also run with the approved localhost-enabled Go test
environment: `go test ./internal/api/... ./internal/config/...` — PASS.

## Behavior evidence mapped to `qa_plan.md`

| QA-plan behavior | Evidence | Result |
|---|---|---|
| Grant, Unicode quote bound, and no-context fallback | `TestAwardGrant_WhenJokeToExistingViewer_ExpectScoreAndAlert`, `TestAwardGrant_WhenMessageTextExceedsCodePointLimit_ExpectTransientBoundedQuote`, and `TestAwardGrant_WhenNoMessageContext_ExpectGrantWithoutHighlightFields` passed as part of Go test. They use real `httptest` + WebSocket clients, assert award fields/`created_at`, a 280-rune emoji quote, exact message reference, and omission of highlight fields when absent. | PASS |
| HTTP validation and compatibility | API tests cover empty user ID and unknown award as HTTP 400. `command_fire_test.go` asserts a command alert has `created_at` and no award/quote fields. Routing was also covered by full API tests. | PASS |
| Exact chat-row highlight/repeated timer/no guessed row | `reward-highlight.test.js` passed: exact `platform + NUL + message_id` matching only, command/no-ID rejection, non-color label, and replacement of the previous 2.5-second timer. | PASS |
| Award queue priority, non-preemption, expiry, capacity, legacy source/reload | `alert-scheduler.test.js` passed with injected fake clocks: visible command completes before award selection; award lane is FIFO/priority; 10-second command expiry and receive-time fallback work; all documented capacity branches and unknown-source/reload-empty behavior are covered. `alert-lifecycle.test.js` passed the audio-failure progression path. | PASS |
| Safe contextual alert rendering | `alert-render.test.js` passed: award hierarchy, optional quote omission, HTTP(S)-only avatar handling, and untrusted quote rendered via `textContent`, without `innerHTML`. | PASS |
| Live Leaderboard/Statistics, catalog selection, New stream markup | `live-data-helpers.test.js`, `live-toolbar-markup.test.js`, existing Live tests, and catalog/Studio helper tests passed under `npm test`; this includes uncached cross-period clearing, cached same-period recovery, period filtering/cache/debounce, and markup/helpers. | PASS (automated) |
| Per-surface opacity resolution and Studio draft behavior | `overlay-settings.test.js` and `surface-opacity.test.js` passed: independent Chat/Leaderboard/Alerts `0`, `.35`, `1`; normal legacy shared fallback; historical cockpit glass when untouched; explicit cockpit zero; query compatibility; invalid draft retention; surface-only edit retention; and leaderboard layout/font preservation. | PASS |
| Config validation, atomicity, restart/downgrade compatibility | Focused API/config tests passed. `TestConfig_WhenSurfaceOpacityInvalid_ExpectAtomicRejection` preserves the prior snapshot; malformed types produce 400; `TestStore_WhenSurfaceOpacityOverridesSaved_ExpectRestartRoundTrip` reloads `0`, `.35`, `1` and reads a prior-binary-shaped JSON view retaining shared `.58`. | PASS |

## Config fixture excerpts (non-secret test data)

The API round-trip fixture uses the following public preset values (no tokens
or credentials are quoted):

```json
"style": { "panel_opacity": 0.58 },
"surfaces": {
  "chat": { "panel_opacity": 0 },
  "leaderboard": { "panel_opacity": 0.35 },
  "alerts": { "panel_opacity": 1 }
}
```

The legacy-load fixture contains only shared `"panel_opacity": 0.35` and
asserts that all three surface effective values resolve to `0.35`. The invalid
update fixture sets alert opacity to `1.2`, receives HTTP 400, and asserts the
stored snapshot is unchanged. The restart test writes the three explicit values
and confirms that a reduced/older JSON reader still sees shared `0.58`.

## Privacy, persistence, API, and WebSocket assertions

- The changed grant path sends `message_text` only through the bounded
  `awardAlertContext` to the WebSocket wire payload. `trimAwardMessageText`
  trims and caps the value at 280 runes before that construction.
- The durable `AppendInteractionEventInput` receives only kind, viewer ID,
  award ID, points, time, and optional message platform/ID. The SQL insert in
  `internal/store/interaction_events.go` has no text column or text argument.
  The existing schema assertion lists only `message_platform` and `message_id`
  for message reference fields.
- Baseline-to-current diff inspection found no added Goose migration or SQL
  file (`git diff --name-only 981c4cc --diff-filter=A` for migration/SQL paths
  was empty). `interaction_events` remains unchanged in
  `00002_commands_awards.sql`.
- Precise search of changed API/store code found `message_text` only in the
  request/wire boundary and its tests; it found no `message_text` use in store
  inputs, SQL, or `clog`/`slog` calls. This is source-level evidence; no real
  quoted-grant session-log capture was performed.
- The current wire tests prove the new award optional fields and `created_at`;
  command fixtures continue to omit award/message context. No new route method
  or `{id}` mutation route is present in the change; the API suite is green.

## Headless static-server smoke

A disposable headless server was started with:

```text
go run ./cmd/comm-relay-server \
  -addr 127.0.0.1:17893 \
  -config /tmp/comm-relay-qa.10XDFp/config.json \
  -web /home/agent/work/comm-relay/web
```

It used only the temporary config/database/log directory above, started its
HTTP manager successfully, and was then stopped with Ctrl-C; shutdown logged
as complete. The sandbox disallows loopback sockets, so the server and curl
requests were run with approved escalation.

| Request | Result |
|---|---|
| `GET /health` | HTTP 200 JSON, `{"status":"ok", ...}` |
| `GET /` | HTTP 200, `text/html; charset=utf-8` |
| `GET /overlay` | HTTP 200, `text/html; charset=utf-8` |
| `GET /overlay/alert` | HTTP 200, `text/html; charset=utf-8` |
| `GET /overlay/leaderboard` | HTTP 200, `text/html; charset=utf-8` |
| `GET /dock/messages` | HTTP 200, `text/html; charset=utf-8` |

No custom live WebSocket/API sequence was added: the deterministic existing Go
tests above exercise `httptest` WebSocket/API grant behavior directly.

## Platform, theme, scaling, and manual matrix

No screenshot, capture, GUI, Wails, OBS CEF, or packaged artifact result is
claimed.

| Matrix/scenario | Status and classification |
|---|---|
| Linux P0 browser/OBS inspection: all five themes; chat highlight/alert at opacity `0`, `.35`, `1`; panel/chips; long text; reduced motion | **Not run — P0 pre-release gap.** No installed browser or OBS CEF/GPU/browser-source runtime. CSS and deterministic unit tests cover selectors/resolution, but cannot substitute for visual inspection. |
| Linux keyboard flows, 100%/150% zoom, narrow toolbar, live-region/focus recovery | **Not run — P0 pre-release gap** for the keyboard/accessibility portions and **P1 pre-release gap** for catalog/toolbar layout. No browser runtime. |
| Windows 11 packaged Wails + OBS, 100%/150% display scaling, upgrade/restart/prior-binary rollback | **Not run — P0 pre-release gap.** Linux-only environment; no package, Windows host, Wails runtime, or OBS. |
| Linux packaged Wails + OBS (X11/Wayland documented) | **Not run — P1 pre-release gap.** No Wails binary/package or OBS runtime. |
| macOS universal packaged browser/OBS smoke | **Not run — P1 pre-release gap.** No macOS host/artifact. |
| Browser suspend/resume, live-reload/reconnect, denied autoplay against actual Browser Source | **Not run — P0 pre-release gap** for expiry/audio/reload runtime observation. Fake-clock scheduler and audio-failure tests passed, but no real browser runtime was available. |
| Config invalid update, restart, legacy fallback, additive downgrade reader | Automated API/config fixture coverage passed; no actual prior packaged binary smoke was available (covered above). |

## Product defects

A fresh Sol/xhigh review found one HIGH compatibility regression in the first
implementation: cockpit themes with historical fixed glass became transparent
when their shared opacity was zero. The bounded repair restores each theme's
former glass only while a surface override is absent; an explicit zero remains
transparent. The same repair corrected cross-period Live rows, invalid Studio
opacity drafts, reward-label collision, stale-preset fallback, reward-picker
busy state, timestamp precision, and changed-asset cache revisions.

After repair, `npm test` (19/19 files), `npm run test:i18n`, `npm run lint`,
`go test ./...`, `go build ./...`, `golangci-lint run ./...`, strict OpenSpec
validation, and staged/unstaged diff checks passed.

The one allowed fresh re-review still failed with two unresolved HIGH findings:

- cockpit compatibility uses one replacement alpha per theme instead of the
  exact baseline alpha per surface/layout (`.70` panel, `.76` popup/chips, and
  `.78` G-Rebels);
- dismissing the reward picker during an in-flight request re-enables its row
  trigger, allowing a duplicate grant and letting the first completion close a
  newly opened picker.

It also reported a MEDIUM no-layout-shift gap because the transient in-flow
reward badge changes row geometry, plus a LOW malformed-alert validation gap.
These findings remain open; R.1/R.2 and distribution tasks are intentionally
unchecked. The manual matrix below remains an explicit evidence gap rather
than a claimed pass.

## Overall QA result: PARTIAL; SOURCE REVIEW FAILED

All required automated commands and the available headless HTTP/static smoke
passed. The result is **PARTIAL**, not PASS, because the required browser/OBS
visual, keyboard/zoom, Windows packaged Wails+OBS P0 matrix, and macOS/Linux
packaged P1 matrix remain unexecuted. Source review also remains failed on the
two HIGH findings recorded above. The installed linter version differs from
the project-prescribed v2.12.2, despite its clean required invocation.
