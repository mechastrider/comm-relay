# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 10+ | amd64 | Same HTTP/SQLite/WebView behavior; alert audio in OBS Browser Source |
| Linux (X11/Wayland) | amd64 | Same; no new `.desktop` or icon work |
| macOS | amd64/arm64 | Same |

Headless `comm-relay-server` is in scope on all three. Wails wrapping does not add APIs for this change.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Goose tables in existing `comm-relay.db` beside config; `hide_command_messages` in `config.json` atomic write | No new dialogs or extra dirs | Migrate fail → process does not serve HTTP (existing fail-closed) |
| clipboard/notifications | Studio copy-URL for `/overlay/alert` uses existing clipboard helper | None | Copy failure already surfaced |
| tray/menu/shortcuts | Unchanged | — | — |
| protocol/file associations | None | — | — |
| single instance/deep open | Unchanged | — | — |
| child processes/IPC | None; WebSocket to OBS/CEF only | — | OBS source missing → no splash/audio; app keeps running |
| sleep/wake/shutdown | In-memory cooldowns reset on process exit; graceful HTTP shutdown unchanged | — | Sleep may stall OBS CEF audio until the source is visible again |

## Security / Privacy / Trust Boundary

- Localhost HTTP remains the trust boundary. Catalog and grant APIs are unauthenticated like the rest of the admin API.
- Interaction events store viewer ids, award ids, command triggers, points, timestamps — not chat body.
- Overlay must not `innerHTML` splash text. Avatar URLs http(s) only.
- Alert sound is intended to be captured by OBS; it is not a new OS notification.

## Not applicable areas

- File/open/save pickers (no media upload).
- Notifications, tray, protocol handlers, extra processes.
- Sandbox entitlements, camera/mic, accessibility OS APIs.
- Power assertions beyond existing process lifetime.
