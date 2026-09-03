# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 10/11 with supported OBS | x86-64 | Primary target: copied test URLs render in OBS Browser Source, including queue timing and permitted audio |
| Linux in currently supported browser/OBS configurations | Existing supported architectures | Same local HTTP/WebSocket and layout contract; no new native integration |
| macOS in currently supported browser/OBS configurations | Existing supported architectures | Same local HTTP/WebSocket and layout contract; no new native integration |
| Web admin in a current Chromium-family browser | Browser runtime | Studio preview and clipboard fallback behave consistently outside Wails |

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | No new files, paths, or dialogs | None | Not applicable |
| clipboard/notifications | Reuse the existing copy-to-clipboard path for test URLs; add no notification integration | Existing browser/Wails clipboard constraints only | Keep the URL selectable and show manual-copy guidance on failure |
| tray/menu/shortcuts | No changes | None | Not applicable |
| protocol/file associations | Dedicated test URLs remain stable ordinary localhost HTTP URLs | None | After restart they reconnect empty; an older build returns 404 instead of serving live content |
| single instance/deep open | No changes | None | Not applicable |
| child processes/IPC | No child process or native IPC; browser and OBS use local HTTP/WebSocket | Existing localhost boundary | Existing reconnect backoff applies after server interruption |
| sleep/wake/shutdown | Pending in-memory debug runs are cancelled on process shutdown; connections retry after wake | None | No debug events are replayed; operator runs the scenario again |

## Security / Privacy / Trust Boundary

- Debug actions and subscriptions remain on CommRelay's existing localhost listener and do not add remote services or firewall requirements.
- Test content exists on one process-global, local-only channel. All clients connected through `/ws/overlay-debug` receive from that audience; multiple Studio tabs and test sources are intentionally not isolated from one another.
- Dedicated test pages at `/overlay/test/chat`, `/overlay/test/leaderboard`, and `/overlay/test/alert` connect only to `/ws/overlay-debug`. Debug clients never receive live message, award, alert, or ranking content, and production `/ws` clients never receive debug content.
- Scenario payloads accept only enumerated scenarios and the confirmed bounded plain-text/numeric fields. No OAuth material, connector credentials, raw HTML, local paths, arbitrary URLs, client-defined steps, or client-defined alert durations are accepted or logged.
- Debug messages, run identifiers, the single run generation, clients, and timers are memory-only. They do not enter config, future SQLite data, chat history, analytics, or award ledgers.
- Browser/CEF autoplay policy is respected. Studio does not attempt to bypass a user-agent permission; the OBS source is the final sound check.

## Not applicable areas

- No filesystem migration, file picker, shell execution, privilege elevation, sandbox entitlement, camera/microphone access, OS notification, tray/menu change, custom protocol, file association, installer registration, or single-instance behavior.
- No platform-specific connector behavior changes.
- No new crash dump or telemetry content is introduced.
