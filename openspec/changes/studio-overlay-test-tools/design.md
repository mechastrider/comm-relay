## Context

Studio currently embeds deterministic `preview=sample` pages. This is useful for appearance editing but bypasses WebSocket timing and cannot demonstrate message-to-award animation, alert queueing, or leaderboard replacement. Production `/ws` uses one broadcast audience, so sending test frames there would put synthetic content on-air. Alert roots already fill the viewport, but themed splashes retain 560–640 px maximum widths and are difficult to fit as an OBS rectangle.

## Goals / Non-Goals

Goals are realistic local scenario playback, hard isolation from live content and persisted product state, consistent operator feedback, restrained use of familiar action icons, and responsive full-frame overlay roots. Non-goals are arbitrary wire-frame injection, real award grants, recording test messages, remote debugging, OBS scene control, a new theme, or a broad visual redesign.

## Component / Process / IPC Boundaries

Studio and copied OBS sources open dedicated test pages at `/overlay/test/chat`, `/overlay/test/leaderboard`, or `/overlay/test/alert`. Those pages connect only to `GET /ws/overlay-debug`. The API owns typed scenario validation and one process-global in-memory run generation. The WebSocket hub keeps the dedicated debug audience separate from production `/ws`; normal overlay pages continue to connect only to production `/ws`. Test pages reuse the normal surface frame handlers and add debug reset behavior.

```text
Studio POST scenario ──> global test runner ──> /ws/overlay-debug clients
                                                   ├── Studio test preview
                                                   └── one or more OBS test sources
production bus ─────────────────────────────> production /ws clients only
```

## State and Event Flow

1. Studio enters explicit test mode and opens the selected dedicated test page; every connected dedicated test surface joins the same process-global debug audience.
2. Studio offers a stable test URL that follows the active preset and, secondarily, a current-preview snapshot URL containing safe unpublished draft appearance overrides. Both use dedicated test paths and omit preview, sample, and background-only flags.
3. `scenario/fire` validates an enumerated scenario and applicable bounded overrides: optional `display_name` up to 64 characters, `message` up to 500, `label` up to 80, and integer `points` from 1 through 1000.
4. Every Run or Replay atomically cancels the prior global run, advances its generation, and enqueues `debug_reset` before any immediate scenario frames. Reset clears chat, leaderboard, visible and pending alerts, and transient timers and dedupe state.
5. Scenario steps are production-shaped but bypass the production bus and stores:
   - `message`: an immediate message;
   - `rewarded_message`: an immediate message followed by its matching award at 700 ms;
   - `command_alert`: an immediate command alert;
   - `leaderboard_update`: an immediate deterministic three-row snapshot with only safe supplied overrides applied;
   - `alert_burst`: three alerts in command, award, command order at short deterministic intervals.
6. Fixed alert display durations are server implementation constants and are not client-controlled.
7. Fire returns HTTP 200 after reset and immediate frames are enqueued and delayed steps, if any, are scheduled: `{"status":"started","run_id":"…","delivered_clients":N}`. `delivered_clients` counts unique currently connected debug sockets whose send queues accepted the initial reset/immediate delivery. If the count is zero, the action still succeeds and schedules no delayed steps.
8. Reset atomically cancels and clears only, then returns HTTP 200 `{"status":"reset","delivered_clients":N}`, where the count is the unique debug sockets whose queues accepted `debug_reset`.

## Threading / Async / Cancellation

The process has at most one active test run. Fire and reset serialize generation advancement, cancellation, reset enqueueing, and new-run setup so concurrent Studio tabs cannot interleave run setup. Timers use cancellable contexts plus a generation check immediately before every delayed send. Hub fan-out retains existing non-blocking slow-client behavior. If initial delivery reaches zero sockets, no delayed step is scheduled. Completed run state is released, and process shutdown cancels all timers.

## Security and Trust Boundaries

The feature remains on the existing localhost server boundary. Dedicated page and WebSocket routes are the fail-closed trust boundary: test pages never connect to production `/ws`, normal overlay pages never connect to `/ws/overlay-debug`, and older builds do not recognize the test paths. The server bounds request size and the confirmed field limits. Scenario names are enumerated; raw events, HTML, URLs, scripts, client-defined steps, and client-defined alert durations are not accepted. Overlay text continues through text-safe production rendering. Debug actions bypass the product bus and stores so they cannot alter viewers, scores, history, analytics, settings, active presets, or interaction records.

## Decisions and Alternatives

1. **Use dedicated fail-closed test routes and one global test channel.** Dedicated pages and `/ws/overlay-debug` test actual HTTP/WebSocket/OBS behavior without risking downgrade fallback to live content. A single process-global audience keeps copied URLs stable across restarts and makes multiple connected Studio/OBS receivers explicit through `delivered_clients`.
2. **Use typed scenarios, not arbitrary JSON.** A small scenario catalog gives repeatable coverage and a bounded security surface while still allowing safe text/points overrides.
3. **Keep static sample preview and add explicit test mode.** Static samples remain faster for theme comparison; test mode makes its non-live event semantics unambiguous. Stable test URLs follow the active preset and can remain in OBS, while optional snapshot URLs carry current unpublished draft appearance overrides and must be recopied after later draft edits.
4. **Reuse production frame handlers.** Test rendering must not drift into a parallel mock renderer. Debug routing metadata stays outside domain persistence.
5. **Fill the surface root, then preserve component semantics.** Alerts have one primary chrome and therefore fill the available rectangle; chat rows remain bottom-anchored and content-sized, and leaderboard panel/chips behavior remains configurable.
6. **Use icon-only controls for familiar contextual actions.** Copy, refresh, replay, and the preset toolbar's create, rename, duplicate, and delete actions use standard icons, tooltips, accessible names, and focus states. Preset actions remain visible beside the selector instead of moving into a text overflow menu; deletion keeps destructive styling, disabled semantics, and confirmation. Primary and ambiguous actions elsewhere keep visible labels.
7. **Give shared buttons physical depth.** Existing shared text and icon button components use a raised rest/hover treatment and a pressed active treatment without layout movement. Tabs, navigation, selects, and choice chips keep their distinct interaction language.

## Risks / Trade-offs

- Every connected test source shares one channel, so Run, Replay, or Reset from another Studio tab globally interrupts the current test. Receiver counts and persistent test-only guidance make this visible.
- A stable test URL follows later active-preset changes; a current-preview snapshot intentionally becomes stale after later unpublished draft edits and must be recopied.
- A dedicated test URL opened by an older build returns 404. This explicit incompatibility is the fail-closed behavior and cannot expose live content.
- Removing alert maximum widths can expose weak theme composition at unusual dimensions. QA covers landscape, square, portrait, and banner matrices with safe inner padding.
- Browser audio autoplay rules differ between Studio and OBS. The feature does not bypass them; OBS remains the authoritative sound smoke test.
- Multiple test sources increase delivery count. Studio reports receivers rather than implying one target.

## Migration / Rollout / Rollback

No config, browser storage, or database migration is needed. Existing production overlay paths and `/ws` retain current behavior. Rollback removes the dedicated test pages, debug WebSocket, debug actions, and layout changes; older or rolled-back builds return 404 for saved test URLs, and no stored data requires cleanup.

## Open Questions

None.
