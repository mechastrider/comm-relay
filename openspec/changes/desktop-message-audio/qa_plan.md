# QA Plan
## Platform Matrix
Linux WebKitGTK native harness and compiled Wails shell available locally. ALT Linux p11/PipeWire/X11, Windows and macOS require separate manual smoke.
## Behavior and UI Scenarios
Cold startup without clicks -> first live message after readiness sounds; disabled/zero-volume stay silent; all presets and Test use the same sink; history and pre-readiness events never replay; navigation retains sound.
## Filesystem / IPC / Permission / Lifecycle Scenarios
Reject other origins, sibling/preview frames and malformed payloads. Repeated handshake/cleanup must not leak ports or play duplicates. Browser fallback works without native APIs. Suspension recovery never emits old notifications.
## Persistence Migration / Corruption / Recovery
Not applicable: no persistent changes.
## Install / Upgrade / Downgrade / Packaged-App Smoke
Build production Wails with webkit2_41. Native smoke uses disposable data and verifies no-click playback; actual target OS hearing/suspend checks are reported separately.
## Automated Commands / Manual Setup / Fixtures
npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e -- --project=chromium --grep desktop-audio; go test ./...; golangci-lint run ./...; go build -tags wails,production,webkit2_41 -o /tmp/comm-relay-audio-research/comm-relay-desktop ./cmd/comm-relay-desktop.
## Evidence and Explicit Skips
Verified on 2026-11-04:
- npm ci, typecheck, lint, build: passed.
- npm test: 41 static surface test files and 38 Vitest tests passed.
- Chromium desktop-audio integration: passed without clicks, verifies real shell modules, trusted iframe handshake and one playback sink. Native Go calls are mocked in this browser test; it is not evidence of OS autoplay behavior.
- Existing Chromium command-audio navigation/disable regression: passed.
- go test ./... and golangci-lint run ./...: passed.
- go test -tags wails,webkit2_41 ./cmd/comm-relay-desktop: passed.
- Tagged desktop lint: three pre-existing errcheck findings on runtime.MessageDialog in main_wails.go. With --new-from-rev HEAD (the pre-change commit), zero new findings.
- Production Wails/Linux build: passed; disposable-config startup under Xvfb completed, admin rendering confirmed by screenshot and a CommRelay WebKitWebProcess PulseAudio playback stream appeared without input.
- Real Wails smoke initially caught a startup regression when bridge.js was deferred as an ES module. Keeping openAdmin in the synchronous classic bridge and dynamically loading optional audio resolved it; browser tests alone had not exposed the ordering.
- Native GTK/WebKitGTK 2.50.4 harness loaded the actual shell bridge and shared tone source under wails://wails, with a separate loopback admin iframe. The native binding shim invoked webkit_web_view_run_javascript, as Wails v2 does. With no user input, observed: prepare -> context:running -> play -> oscillator:running. The earlier direct iframe activation experiment remained suspended, establishing why the parent audio context is needed.
- Trust tests reject wrong origin, wrong port and nested frames; validate presets/volume; verify channel replacement and cleanup. Browser service tests verify fallback and cancellation; tone tests verify no stale replay.

Explicit gaps: the native harness uses PulseAudio/Xvfb, not ALT Linux p11/PipeWire/X11, and verifies audio graph scheduling rather than human-audible output. Real Windows/macOS and target ALT Linux cold-start, minimize/restore, idle and sleep/wake checks remain manual pre-release smoke. No visual redesign, storage or OBS behavior change.
