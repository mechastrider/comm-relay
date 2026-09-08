# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported releases) | Packaged architecture | Wails WebView and a normal browser use the same localhost history API and Audience UI |
| Linux (project-supported distributions) | Packaged architecture | Same behavior; no desktop-entry, compositor, or file-permission change |
| macOS (project-supported releases) | Packaged architecture | Same behavior; no entitlement or signing change |
| Headless server on supported OS | Packaged architecture | Exposes the read-only local API; a browser may use the admin UI |

Viewer awards originating from Twitch, YouTube Live, or VK Live share the canonical viewer/event model. No platform connector behavior differs.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Existing SQLite beside configuration gains an append-only migration; no dialog or new file location | Existing user-data directory access | Migration failure follows existing startup failure handling; no partial version is recorded |
| clipboard/notifications | Unchanged | None added | Existing behavior |
| tray/menu/shortcuts | Unchanged | None added | Existing behavior |
| protocol/file associations | Unchanged | None added | Not applicable |
| single instance/deep open | Unchanged | None added | Existing behavior |
| child processes/IPC | Localhost HTTP remains the browser/WebView boundary; no native IPC or process is added | Existing loopback trust model | Read failures stay local to the history panel and are retryable |
| sleep/wake/shutdown | Durable entries survive restart; no in-memory history cache is authoritative | Existing database access | Next open/refresh reads SQLite again |

## Protocol Contract

- `GET /api/reward-history` is identical across desktop OSes, browser admin, and Wails WebView.
- Query fields are `viewer_id`, `limit`, and opaque `cursor`; viewer ids never appear as path segments.
- Response JSON uses snake_case and contains `entries` plus optional `next_cursor`.
- No WebSocket message, connector event, native binding, command-line flag, environment variable, or `config.json` key is added.

## Security / Privacy / Trust Boundary

- Data remains in the existing local SQLite database and is served only by the existing listener configuration.
- The read endpoint exposes operator-facing viewer display names and reward facts but no platform account id, chat text, source-message id, secret, OAuth token, proxy credential, or local filesystem path.
- Cursor values are untrusted input: decode bounds, validate both components, and bind decoded values as SQL parameters.
- The admin renders all persisted names as text, never trusted HTML.

## Not applicable areas

- Native open/save dialogs, media pickers, overlay-asset directories, and filesystem watchers.
- Clipboard, native notifications, tray/menu commands, global shortcuts, protocol handlers, file associations, deep links, and single-instance routing.
- Camera, microphone, screen capture, accessibility-service permission, firewall elevation, and sandbox entitlements.
- Child-process lifecycle, shell execution, connector authentication, OBS scene switching, and overlay/dock WebSocket consumers.
- Installer contents, autostart, desktop entries, code signing, notarization, and package metadata.
