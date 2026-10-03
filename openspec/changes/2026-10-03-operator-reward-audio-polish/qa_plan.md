# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Current Windows host | Host architecture | Desktop WebView, keyboard/pointer, RU/EN | yes |
| Playwright Chromium | Host architecture | All leaderboard themes, panel/chips, landscape/square/portrait/banner | yes |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| Viewer terminology | Open Live and exercise announce/status/award/close copy in RU/EN | Viewer reward labels, existing behavior | P1 |
| App command audio | Send live command frames with built-in/custom/silent/zero-volume sounds | Correct audio, custom priority, no overlay required | P0 |
| Audio source scope | Send awards, greetings, progression, and reward alerts | Silent in app; normal queue timing | P1 |
| Lifecycle | Burst alerts, disable during pending play, navigate, reconnect, unmount | Bounded queue, no overlap or stale replay; no leaked resources | P0 |
| Autoplay/error | Reject play/resume, activate recovery, send new command | Visible recovery; later event plays; no old audio | P0 |
| Top alignment | Vary row count, viewport and theme in panel/chips, live/sample | Top padding respected, no partial rows or scrollbars | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

Validate same-origin safe filenames. No new OS permission or IPC. Check rejected asset loads and audio promises cannot stop event delivery.

## Persistence Migration / Corruption / Recovery

Old config with/without admin block defaults on; explicit false survives save/load and omitted-field updates. Invalid JSON follows existing behavior.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Build frontend before Go. Smoke local Windows desktop playback using an isolated config, including a recorded voice clip. Confirm no packaging changes are necessary. Report any unavailable manual audio verification explicitly.

## Automated Commands / Manual Setup / Fixtures

Run `npm ci` once, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and relevant `npm run test:e2e -- --grep <focused-pattern>`. Run `gofmt` on changed Go files, `go test ./...`, `golangci-lint run ./...`, and `git diff --check`. Use isolated test config/assets; never change the operator's live installation.

## Evidence and Explicit Skips

Verified on 2026-10-03, Windows amd64:

- `npm ci --cache C:/apps/comm-relay/var/npm-cache --prefer-offline` succeeded after the default user cache was denied by the sandbox.
- `npm run typecheck`, `npm run lint`, and `npm run build` passed.
- `npm test` with `TZ=UTC` passed: 201 static-surface tests and 30 Vitest tests. An existing reward-history date assertion assumes UTC and fails in the host's Moscow timezone.
- Chromium regression: command audio produced real browser `playing` events for a valid PCM file at 25% volume, survived workspace navigation, stopped accepting playback when disabled, and retained the disabled preference after reload.
- Chromium geometry: all five themes, panel/chips, four viewport shapes (40 combinations) stayed top-aligned without page overflow. Existing reward announcement/close and deliberate winner-settlement workflows passed.
- `go test ./internal/config ./internal/api -run "TestConfig|TestLoad|TestValidate" -parallel 1` passed. Full `go test ./...` encountered Windows `TempDir RemoveAll` cleanup failures in API tests. Re-running with `-parallel 1` passed the entire API package but failed cleanup in existing `TestSave_WhenRoundTrip_ExpectEqual`; functional assertions did not fail. The full-suite gate remains open for an environment without these cleanup failures.
- Installed golangci-lint was built with Go 1.26 and could not analyze Go 1.27.1. Rebuilt its cached v2.12.2 source with Go 1.27.1 into the workspace; `golangci-lint run ./...` then passed with zero issues. This is not validation with the guide's preferred v2.13.2.
- Frontend and embedded headless server builds passed. `go build -tags wails,production -o var/comm-relay-desktop-operator-polish.exe ./cmd/comm-relay-desktop` passed. Go emitted a non-fatal warning about writing module metadata to the sandboxed user cache.
- `openspec validate --specs` passed for all 27 canonical specs; strict validation of this change and `git diff --check` passed.

Manual listening in Wails/OBS and packaged GUI interaction were not performed: browser automation proves media playback events, not sound at the operator's speakers. No release, signing, native installation, or live operator config changes were made. No Go concurrency or server ingest/broadcast paths changed, so no new pipeline counter or race gate applies.

Fresh diff review checked default/explicit-false handling, old-client omissions, source filtering, safe filenames, zero volume, late-play cancellation, unmount cleanup, navigation ownership, and terminology consistency. No critical implementation finding remains.

Closeout used the visible conversation as evidence. Agentmem context lookup failed with a vector-dimension mismatch (1024 versus 1536), so memory capture is unavailable and no event or draft was recorded.

## PR CI Follow-up

- Initial Linux CI run `37137844684` passed the full Go race suite and golangci-lint v2.13.2. The earlier Windows cleanup/toolchain limitations no longer block Q.2.
- Browser CI exposed stale Live visual baselines after the intentional reward-label change and an audio-test race in Firefox. Instrumenting real AudioContexts confirmed that `resume()` completed after the test had already delivered its first command. The test now waits for running contexts after the user gesture; it still requires actual media `playing` events at the requested volume. No browser autoplay policy or application behavior was changed.
- The focused command-audio and leaderboard tests passed locally in Chromium and Firefox (four tests). Typecheck, ESLint, build, 201 static-surface tests, and 30 unit tests passed again.
- Repetition checks: Chromium passed five audio runs; Firefox passed three sequential audio runs. A parallel Windows repeat run encountered three page-teardown timeouts and one initial page-reload timeout, distinct from the original audio assertion failure. No timeout increase or retry was introduced; Linux CI remains the full cross-browser gate.
- Visual assertions now collect every workspace difference in a viewport test instead of aborting at the first screenshot. Failed comparisons still fail the test; thresholds, retries, and timeouts are unchanged. Linux baselines are sourced from CI artifacts and visually reviewed, not generated on Windows and relabeled.
- Follow-up Linux run `37139256830` confirmed that awaiting resume alone was insufficient: Firefox's AudioContext never reached running on the headless runner. The browser job now starts PulseAudio with an explicit null output sink, providing a real backend without physical speakers or mocked playback. Settings baselines were reviewed and refreshed from that run. It also exposed a separate WebKit viewer-merge failure with interrupted detail/list requests; the next full run will verify whether that recurs.
- Run `37139853657` passed Go/lint and 158 of 159 browser tests, including Firefox audio, every visual baseline, and the WebKit viewer merge. The only failure was WebKit's real-backend volume quantization (`0.2499983161687851` versus `0.25`); the audio assertion now allows an absolute difference below `0.00005`, preserving the 25% requirement without demanding bit-identical floating-point values.
