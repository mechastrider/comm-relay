# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 11 | amd64 | Wails WebView2 and an external Chromium/Firefox browser SHALL expose the same four workspaces and API behavior. |
| macOS current supported release | universal 64-bit | Wails WebKit and an external browser SHALL expose the same workspaces; unsigned-app launch behavior is unchanged. |
| Linux supported desktop distributions | amd64 | Wails GTK/WebKit and an external browser SHALL expose the same workspaces; existing GTK/WebKit and OBS Browser Source limitations remain documented exceptions. |
| Headless server on Windows, macOS, or Linux | release architecture | The browser admin at `/` SHALL provide the complete redesign without requiring Wails APIs. |

Exact web-engine rendering may differ in font rasterization and native form metrics, but navigation, save semantics, responsive breakpoints, focus behavior, and accessible names MUST remain equivalent.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Existing config and viewer-data locations remain unchanged. The redesign introduces no native file picker or filesystem path input. | Existing process-user permissions apply. The web UI receives no direct filesystem access. | Existing API errors are shown inline; no alternate storage location is silently selected. |
| clipboard/notifications | Copy actions use the browser Clipboard API when available and an existing safe fallback otherwise. No OS notifications are added. | Clipboard write may require a secure/local context and user gesture. | A failed copy keeps the URL visible/selectable and reports failure without claiming success. |
| tray/menu/shortcuts | Existing Wails tray/menu behavior is unchanged. The redesign defines only in-document keyboard behavior. | N/A | Existing tray/menu fallback remains unchanged. |
| protocol/file associations | No protocol or file association is added. OBS sources remain HTTP URLs on the configured local address. | N/A | Invalid or unavailable URLs show existing connection guidance. |
| single instance/deep open | Existing single-instance behavior is unchanged. Workspace hashes are internal browser navigation and are not registered as OS deep links. | N/A | Unknown hashes fall back to Live. |
| child processes/IPC | No child process, native bridge method, or new IPC channel is added. Browser/Wails UI communicates only through localhost HTTP and WebSocket. | Existing bind-address trust boundary applies. | Independent API failures remain scoped to their workspace and retryable. |
| sleep/wake/shutdown | Existing server, connector, and WebSocket lifecycle behavior is unchanged. | N/A | After wake or transient disconnect, polling and WebSocket reconnect restore current state without a desktop restart. |

## Security / Privacy / Trust Boundary

The desktop webview and external browser are untrusted clients of the same localhost API. The new activation action cannot access arbitrary files or submit partial secrets; it accepts only an existing preset ID and returns public config. OAuth tokens, client secrets, and proxy passwords remain server-side. Viewer names, messages, hash state, API errors, and URL labels are rendered without HTML interpretation.

The redesign adds no cloud service, telemetry, external web asset, OS permission, or data export. If the operator deliberately changes the listen address beyond loopback, the existing exposure risk remains unchanged and must not be understated by the UI.

## Not applicable areas

- Native dialogs: no new open, save, permission, or confirmation dialog outside the web document.
- OS notifications: live status and action feedback stay inside the console.
- Global shortcuts/media keys: no command is registered outside the focused document.
- Protocol/file associations and deep links: no change.
- Installer, auto-update, signing, firewall, startup registration, and service management: no change.
- OBS WebSocket, scene collection access, and source visibility: deliberately excluded.
- Power inhibition and background execution privileges: no change.
