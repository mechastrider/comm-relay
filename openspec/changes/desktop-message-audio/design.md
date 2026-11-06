## Context
The shell retains Wails IPC in its top-level document and embeds loopback admin. Cross-origin postMessage does not transfer native WebKit activation (verified with WebKitGTK 2.50.4).
## Goals / Non-Goals
Make enabled message notifications work without a first click. Preserve browser fallback and no stale replay. Other alert audio is outside scope.
## Component / Process / IPC Boundaries
Share tone synthesis between browser service and shell. The shell accepts audio requests only from its exact admin origin and contentWindow, through a MessageChannel. Native bindings execute fixed preparation/play scripts; they never accept JavaScript from callers.
## State and Event Flow
Admin mounts -> handshake -> shell asks native preparation -> AudioContext running -> channel ready. New notifications are forwarded only when ready. Test uses the same sink. Page cleanup closes the channel. New handshakes supersede the previous channel.
## Threading / Async / Cancellation
Native WindowExecJS schedules evaluation on the GUI thread. Keep the navigation bridge synchronous: Wails OnDomReady may precede deferred module evaluation. Dynamically import optional shell audio only on a validated request. No startup sleeps or polling. A bounded handshake timeout preserves standalone browser behavior. Sounds received before readiness or while suspended are dropped, not queued. Native reactivation may prepare future sounds.
## Security and Trust Boundaries
Validate exact frame and origin before accepting a port; validate sound enum and finite volume in JS and Go. No arbitrary scripts, URLs or files. Preview frames cannot invoke the bridge.
## Decisions and Alternatives
Keep audio in the parent because activation does not cross iframe postMessage. Reuse synthesis to preserve tones. Reject Wails fork/v3 migration and separate native playback engine for this bounded fix.
## Risks / Trade-offs
Native evaluation is verified on Linux but packaged Windows/macOS smoke remains required. Enable existing macOS autoplay preference. Browser autoplay policy remains browser-owned.
## Migration / Rollout / Rollback
No data migration; revert code to roll back. Record platform verification limits in PR.
## Open Questions
None blocking implementation; target ALT Linux and other OS manual validation remains release evidence.
