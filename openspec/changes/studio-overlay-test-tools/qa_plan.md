# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 10/11 + supported OBS | x86-64 | Default and cockpit themes; 100%/150% display scaling; mouse and keyboard | yes, P0 packaged-app/OBS smoke |
| Current Chromium-family browser | Host architecture | Light/dark Studio; browser zoom 80%/100%/125%; keyboard and screen reader semantics | yes, P0 automated/manual web coverage |
| Linux current supported browser/OBS | Existing | Default theme; 100% scale; mouse/keyboard | P1 compatibility smoke |
| macOS current supported browser/OBS | Existing | Default theme; Retina scaling; mouse/keyboard | P1 compatibility smoke when environment is available |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| `overlay-debugging`: fail-closed isolation | Connect normal overlay routes to `/ws` and dedicated test routes to `/ws/overlay-debug`, then fire each scenario | Every dedicated test client can receive debug content and appearance settings; production clients receive no debug content; debug clients receive no live content | P0 |
| `overlay-debugging`: global audience | Connect two Studio tabs and multiple dedicated test surfaces, Run from one tab, then Replay from the other | All test sockets share the run/reset stream, the later action globally replaces the prior run, and `delivered_clients` reports unique accepting debug sockets | P0 |
| `overlay-debugging`: no mutation | Snapshot config and product repositories, fire every scenario, compare state | No score, viewer, history, analytics, interaction, or config changes | P0 |
| `overlay-debugging`: cancellation | Fire `rewarded_message`, replace or Reset after the immediate message and before 700 ms | Surfaces clear before any replacement frames; no delayed award from the old generation arrives | P0 |
| `http-api`: validation | Send unknown scenarios, `display_name` over 64, `message` over 500, `label` over 80, non-integer/out-of-range `points`, and invalid JSON | UI-safe bounded error and no broadcast; valid boundary values are accepted | P0 |
| `http-api`: response timing | Fire delayed scenarios with zero, one, and multiple debug sockets | HTTP 200 returns after initial enqueue/scheduling, counts unique accepting sockets, and zero receivers schedules no delayed steps | P0 |
| `websocket-feed`: slow client | Stall one debug client while another consumes a burst | Hub remains responsive and follows existing slow-client policy | P0 |
| Studio test flow | Enter test mode, select scenarios, edit fields, Run/Replay/Reset, exit | Compatible controls only, input retained on error, receiver count shown, static sample restored on exit | P0 |
| Test URL distinction | Copy stable and snapshot URLs for all surfaces, change draft and active appearance, restart, and inspect production URLs | Dedicated paths are correct, stable URLs follow active preset across restart, snapshots retain copied draft overrides, preview/sample/background-only flags are absent, and production URLs/preset are unchanged | P0 |
| Scenario catalog | Run all five scenarios with safe overrides | Immediate message/command/three-row leaderboard behavior, rewarded award at 700 ms, and alert burst command→award→command ordering match the contract | P0 |
| Rewarded message | Run scenario with chat and alert test sources | Chat uses visible-message reward animation; alert quote and award identity match the immediate sample message | P0 |
| Alert burst | Fire the three-alert burst | Existing bounded non-preempting queue behavior preserves command→award→command order | P0 |
| Icon actions | Inspect and keyboard-activate contextual copy/refresh/replay controls | Shared icon language, localized accessible name/tooltip, visible focus, stable async identity; ambiguous actions retain text | P0 |
| Full-frame surfaces | Render chat, leaderboard panel/chips, and alert in 320×180, 640×360, 1080×1080, 480×720, and 1920×240 viewports | Roots touch all edges without page scrollbars/clipped borders; alert chrome fills safe area; chat rows do not stretch | P0 |
| Long content | Use long name/message and large point value at narrow dimensions | Text wraps or safely clips/fades inside chrome; newest chat content remains legible | P1 |
| Reduced motion | Enable OS/browser reduced motion and run reward/queue scenarios | Non-essential UI motion is reduced; event order and understandable feedback remain | P1 |
| Audio/autoplay | Run sound-bearing command alert in Studio and OBS | No autoplay bypass; OBS behavior is documented and manually confirmed | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Verify that no files are created or modified by scenario fire/reset beyond normal application behavior.
- Deny clipboard access and confirm the URL remains selectable with manual-copy guidance.
- Stop and restart the local server while a delayed run is active; confirm timers disappear, debug sources reconnect empty, and production feeds recover normally.
- Disconnect all test clients and confirm client bookkeeping is released without affecting active production clients or the global run generation.
- Sleep/wake smoke on Windows: reconnect without replaying prior debug frames.

## Persistence Migration / Corruption / Recovery

No migration matrix is required because persistent schemas and browser storage do not change. A server restart test proves debug clients, run generation, timers, and events are memory-only while stable dedicated test URLs remain textually unchanged and reconnect empty. Config and any product repository fixtures are compared before and after all scenarios.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Build the existing headless and Wails artifacts with unchanged packaging inputs.
- Upgrade an existing configuration, open Studio, run scenarios, and confirm existing live/pinned overlay URLs still work.
- Add each copied test URL to OBS on Windows; verify exact rectangle composition, receiver feedback, reconnect, queue timing, and sound policy.
- Open all saved dedicated test page and WebSocket paths against an older build; confirm each returns 404 while `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, and `/ws` retain production behavior.
- Roll back after using test mode; no data conversion or cleanup is expected.

## Automated Commands / Manual Setup / Fixtures

Run from repository root:

```bash
npm ci
npm test
npm run test:i18n
npm run lint
go test ./...
go test -race ./internal/api/...
golangci-lint run ./...
go build ./...
openspec validate studio-overlay-test-tools --strict
git diff --check
```

Add deterministic fixtures for all five scenario names, the exact optional-field boundaries, safe leaderboard overrides, zero/one/multiple accepting receivers, queue capacity, run-replaces-run, and reset-before-delay. Manual setup uses all three normal production surfaces, all three dedicated test paths, and at least two simultaneous test clients so global sharing and leakage are visible.

## Evidence and Explicit Skips

Record command output plus screenshots or a short capture of the viewport matrix and Windows OBS scenario sequence. Inspect browser accessibility names/tooltips and keyboard focus manually in both languages. Signing, notarization, installer registration, database migration/corruption, remote-network exposure, camera/microphone permissions, notifications, and mobile UI are explicitly skipped because the change does not touch them. Linux/macOS OBS evidence may be deferred as P1 only if those runners are unavailable; Windows OBS and browser automation remain mandatory before release.
