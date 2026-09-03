# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported releases) | Packaged architecture | Wails admin and localhost Browser Sources use the same contracts; no Windows API is added |
| Linux (project-supported distributions) | Packaged architecture | Browser/admin behavior is identical; no desktop-entry or compositor integration changes |
| macOS (project-supported releases) | Packaged architecture | Browser/admin behavior is identical; no entitlement or native notification changes |
| Headless server on supported OS | Packaged architecture | All HTTP, WebSocket, config, and static overlay behavior remains available without Wails |

OBS CEF is the critical runtime for `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, and `/dock/messages`. Wails WebView and normal browsers are operator UI runtimes; they do not receive a separate protocol.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Existing atomic `config.json` writes persist optional preset surface opacity; SQLite schema is unchanged; no dialog is added | Existing user-config-directory access only | Invalid opacity rejects the save; last valid config remains active |
| clipboard/notifications | Unchanged OBS URL copy helpers; no notification is added | Existing clipboard behavior only | Existing localized copy failure remains |
| tray/menu/shortcuts | Unchanged | None added | Existing behavior |
| protocol/file associations | No change | None | Not applicable |
| single instance/deep open | No change | None | Existing behavior |
| child processes/IPC | No child process or native IPC; localhost HTTP and `/ws` remain the only runtime boundary | Existing localhost trust model | A disconnected source reconnects with existing backoff; missed alerts are not replayed |
| sleep/wake/shutdown | Page-local alert/highlight timers may pause with the WebView/OBS runtime; graceful server shutdown is unchanged | None | On reload/reconnect, alerts start empty and Live data reconciles through HTTP/current frames |

## Protocol Contract

- `POST /api/awards/grant` remains a POST-action route with snake_case JSON and optional `message_id`/`message_text`.
- `/ws` retains `type: "alert"`; new award context fields and `created_at` are optional and backward-compatible.
- Twitch, YouTube Live, and VK Live connectors require no change. Exact highlight matching uses their already normalized `platform` and stable `id`; missing ids degrade to alert-only feedback.
- Multiple alert Browser Sources schedule independently from the frames each receives. CommRelay does not claim scene visibility or delivery acknowledgement.

## Security / Privacy / Trust Boundary

- The local HTTP server remains unauthenticated under the existing localhost operator trust model; the change does not broaden network binding or remote access.
- Submitted message text is untrusted transient input, bounded to a 280-code-point quote, rendered with text nodes, and excluded from SQLite, config, logs, diagnostics, crash reports, and errors.
- Message matching never falls back to display name or text, avoiding cross-platform identity collisions.
- Surface opacity changes only overlay chrome. Untouched legacy cockpit sources retain their prior theme glass, while an explicit surface value controls that surface. Neither path can create an opaque page background or request new browser/OS permissions.
- No secret, OAuth token, proxy credential, or connector-specific payload is added to the public API or WebSocket feed.

## Not applicable areas

- Native file/open/save dialogs and media directories: no custom assets in this change.
- OS notifications, tray/menu additions, global shortcuts, protocol handlers, file associations, deep links, and single-instance behavior: unchanged.
- Camera, microphone, screen capture, accessibility-service, firewall, elevation, and sandbox entitlements: not used.
- Installer, autostart, desktop-entry, code-signing, and package metadata: no change.
- Child-process lifecycle, external executables, game integration, and OBS scene switching: explicitly out of scope.
