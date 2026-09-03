# QA Evidence — contribution-reward-feedback

Date: 2026-09-02
Baseline: `981c4cc0cb6b3f34f1bae025c8cbdb5bda273c4f`
Current implementation: committed `48def5b8c086a305785ab9c81693925f76f291d6` plus the current unstaged repair batch.

This is a fresh desktop-profile QA run and one bounded QA rerun after a source
review repair. It is read-only except for this evidence file; the pre-existing
dirty worktree was preserved. It replaces the prior `STOPPED@review` narrative
with current QA facts.

The first fresh source review passed with `CRITICAL=0`, `HIGH=0`, and `gaps=0`,
but raised one **MEDIUM** correctness finding: an already-expired incoming
command could reach capacity eviction before expiry removal. The repair now
validates the envelope and rejects an incoming command older than 10 seconds
before any capacity mutation. This QA rerun passes that repair. The final
independent full-diff re-review also passed with `CRITICAL=0`, `HIGH=0`, and
zero blocking evidence gaps.

## Environment

- Linux `5.15.0-181-generic`, `x86_64`; Go `1.26.3`; Node `v24.15.0`; npm
  `11.12.1`; OpenSpec `1.10.0`.
- `golangci-lint` was `2.11.4`, not the `2.12.2` named in `AGENTS.md`. The
  required lint command passed, but this is not a version-identical
  release-tooling check.
- No Chromium/Chrome/Firefox, OBS/CEF, Wails executable, Windows/macOS host,
  or packaged artifact was available.

## Required automated commands

| Command | Result |
|---|---|
| `npm ci` | **PASS** — 215 packages installed. |
| `npm test` | **PASS** — 19 test files; 19 passed, 0 failed. |
| `npm run test:i18n` | **PASS** — locale parity passed. |
| `npm run lint` | **PASS** — `eslint web/` exited 0. |
| `go test ./...` | **PASS** — the sandbox attempt could not read the Go cache or bind `httptest` loopback listeners; the permitted rerun passed all packages. |
| `golangci-lint run ./...` | **PASS** — sandbox context loading failed; permitted rerun reported `0 issues`. |
| `go build ./...` | **PASS** — sandbox build exited 0 with a read-only module stat-cache warning. |
| `openspec validate contribution-reward-feedback --strict` | **PASS** — `Change 'contribution-reward-feedback' is valid`. |
| `git diff --check` | **PASS** — no whitespace errors, including baseline-to-current and current unstaged diffs. |

The command rows above are the required QA evidence. This rerun additionally
passed `node --test web/alert/alert-scheduler.test.js` and repeated `npm test`,
`npm run test:i18n`, `npm run lint`, `go test ./...`, `golangci-lint run ./...`,
`go build ./...`, strict OpenSpec validation, and `git diff --check`. The
repeat full JS suite again reported 19 test files passed, 0 failed; the
permitted Go-test rerun passed all packages; and the permitted linter rerun
reported `0 issues`.

## Focused repair evidence

```text
node --test web/overlay/reward-highlight.test.js \
  web/admin/js/surface-opacity.test.js \
  web/alert/alert-scheduler.test.js

3 test files passed; 0 failed

go test ./internal/api ./internal/config ./internal/store \
  -run 'Test(AwardGrant|Config|Overlay|Interaction)' -count=1

PASS
```

| Repair / requirement | Evidence | Result |
|---|---|---|
| Reward frame animation | The rewarded row now runs two short outline/glow pulses without changing layout or replacing the 2.5-second semantic highlight. The CSS-focused test requires the keyframes and requires the existing reduced-motion static fallback. `npm test`, `npm run lint`, strict OpenSpec validation, and `git diff --check` pass after the repair. | **PASS (automated/source)** |
| Rich chat node identity through reward start, expiry, and restart | `reward-highlight.test.js` creates avatar, emote, image-preview, and fallback text nodes; it asserts strict child identity after start, timer expiry, and a restart. `overlay.js` stores `entry.rewardSlot` and transition callbacks call `updateRewardFeedback`, not `fillMessageRow`; the focused source assertion rejects either transition callback calling `fillMessageRow`. | **PASS** |
| Exact, non-restoring reward lookup | The same test covers exact `platform + message_id` matching, rejects command/missing-id alerts, and covers resettable timers. The implementation only updates a matching existing entry. | **PASS** |
| Exponent opacity input | `parsePanelOpacity("1e-1")` is tested as `0.1`; `1e`, `0.1px`, and `0x1` are rejected. Source tracing confirms the same parser is used for draft validation, Studio publish validation, surface collection/persistence, and preview query serialization, so a valid exponent form publishes/previews as `0.1` rather than a `parseFloat` prefix. | **PASS (automated/source)** |
| Non-positive award frame rejection with legacy command compatibility | `isValidAlertEnvelope` requires award `points > 0` plus award id/name before `enqueue`; focused tests prove zero and negative awards leave both lanes empty. A zero-point legacy command with no `source`/`created_at` remains valid and schedules as a command. | **PASS** |
| Scheduler MEDIUM repair: stale input before capacity | The source now calls `isExpiredCommand(item, receivedAt)` before `removeExpiredCommands` and `insert`, so an incoming command older than 10 seconds returns `null` before it can evict anything. The focused test holds an award visible, fills all 20 command slots with fresh commands, sends a command at `10,001 ms` old, and asserts all 20 fresh IDs remain. A direct fake-clock matrix separately confirms the exact `10,000 ms` boundary is eligible, malformed/legacy `created_at` uses receive time, and unknown sources still use the command lane. Existing tests retain award-first FIFO and all prior capacity branches. | **PASS (QA rerun)** |
| Quote bounds and privacy | API tests exercise a 281-emoji quote (asserting 280 runes), no-context grants, and a unique quote absent from the successful response, error DTO, persisted event, raw config, and public config. Store tests assert no text/quote column or durable DTO field. Source inspection confirms the quote is bounded only for the wire alert; the durable event receives only platform/id. | **PASS (automated/source)** |
| Alert queue | Full JS tests cover one visible alert, award-first FIFO lanes, stale command expiry, all documented capacity branches, unknown-source compatibility, reload-empty behavior, and audio-failure progression. | **PASS** |
| Opacity/config compatibility | Full JS and Go suites cover per-surface values, normal shared fallback, untouched cockpit glass, explicit cockpit zero, malformed/atomic rejection, and restart round trip. No migration or router file changed from the baseline. | **PASS (automated/source)** |
| Live workspace/admin feedback | Full JS suite covers leaderboard frame/cache/recovery helpers, statistics invalidation, catalog selection, reward-picker busy behavior, toolbar markup, and locale parity. | **PASS (automated)** |

## Supported local smoke

A disposable headless server ran on `127.0.0.1:17893` using only
`/tmp/contribution-reward-feedback-qa-config.json`. It returned HTTP 200 for:

```text
/health                 application/json; charset=utf-8
/                       text/html; charset=utf-8
/overlay                text/html; charset=utf-8
/overlay/alert          text/html; charset=utf-8
/overlay/leaderboard    text/html; charset=utf-8
/dock/messages          text/html; charset=utf-8
```

The process then received Ctrl-C and logged clean manager shutdown. This is a
route/static-asset smoke only; it is not browser, OBS, or WebSocket visual
evidence.

## Distribution-readiness probe

- `go build -o /tmp/comm-relay-headless-cycle3 ./cmd/comm-relay-server`
  passed and produced a Linux amd64 ELF headless binary.
- `go build -tags wails -o /tmp/comm-relay-desktop-linux-cycle3
  ./cmd/comm-relay-desktop` passed after the pinned Wails module was available,
  producing a Linux amd64 ELF desktop binary.
- The release workflow still declares the expected artifacts and contents:
  `CommRelay-<version>-windows-amd64.zip`,
  `CommRelay-<version>-macos-universal.zip`, and
  `CommRelay-<version>-linux-amd64.tar.gz`, with the existing executable,
  documentation, and Linux desktop-integration files. This matches
  `distribution_plan.md` and no packaging path changed in the implementation
  diff.
- The pinned `Wails CLI v2.12.0` production package build reached compilation
  but failed because `pkg-config` is not installed in this environment. It did
  not produce a package. Windows and macOS package jobs cannot run on this
  Linux host.

D.1 therefore remains unchecked: static workflow inspection and local binary
builds do not substitute for the complete three-platform package artifact
matrix. D.2 remains unchecked because no packaged Wails/OBS platform runtime
is available.

## Final independent re-review

The final full-diff re-review passed with no findings:
`CRITICAL=0`, `HIGH=0`, `MEDIUM=0`, `LOW=0`, and zero blocking evidence gaps.
It confirmed the stale-command repair, reward-slot DOM stability, consistent
opacity parsing, award validation, privacy, compatibility, and the honest open
QA/distribution checkboxes.

## Explicitly unrun / unsupported scenarios

These are not passes and remain release evidence gaps.

| QA-plan scenario | Status |
|---|---|
| Linux browser/OBS visual smoke for `default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, and `g_rebels_popups`; all surface opacity values; leaderboard `panel`/`chips`; long Latin/Cyrillic text; reduced motion | **Not run — P0.** No browser or OBS/CEF runtime. |
| Keyboard/focus/live-region picker/catalog/opacity flows; Live toolbar narrow layout; 100%/150% browser zoom | **Not run — P0/P1.** No browser runtime. |
| Real Browser Source WebSocket reconnect/reload, alert reload-empty behavior, suspend/resume expiry, audio-autoplay denial, and shared multi-client/slow-client behavior | **Not run — P0.** Deterministic unit coverage exists, but no Browser Source runtime. |
| Admin/dock grant success/error interaction against a rendered message row, including visual retry/focus return | **Not run — P0.** Covered by tests/source only; no browser or OBS dock. |
| Copied legacy config publish/restart, corrupt-config recovery, backup/restore, and actual prior-binary downgrade | **Not run — pre-release gap.** Config/API tests cover the model; no package/prior binary was available. |
| Windows 11 packaged Wails + OBS, 100%/150% display scaling, upgrade/restart/rollback | **Not run — P0.** No Windows, package, Wails, or OBS. |
| Linux packaged Wails + OBS and macOS packaged browser/OBS smoke | **Not run — P1.** No corresponding runtime or artifacts. |

Per the plan, no database migration load/performance scenario and no
connector-specific network scenario were run because the SQLite schema and
connectors are unchanged. No installer, signing, notarization, tray,
protocol-handler, cloud, media-file, or OBS scene-control test is applicable
to this change.

## Gates and verdict

**Verdict: ARCHIVE ACCEPTED WITH EXPLICIT MANUAL GAPS.** All available required
automated checks, repair-focused tests, source verification, and local
static-route smoke pass. The prior reward-transition, exponent-parser,
non-positive-award, and stale-incoming command defects are verified as repaired
by this run.

On 2026-09-02 the product owner explicitly accepted closing Q.1, D.1, and D.2
for archival without executing the unavailable browser/OBS and cross-platform
package matrix. The unrun scenarios above remain facts and are not converted to
passes. This acceptance closes the historical change record; it is not a
release-readiness certification and does not erase the listed P0/P1 evidence
gaps or the local `golangci-lint` version mismatch.
