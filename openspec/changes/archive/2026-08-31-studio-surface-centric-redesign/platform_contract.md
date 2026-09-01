# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 11 | amd64 | Wails WebView2 and an external Chromium/Firefox browser SHALL show the same Studio workspace, copy fallback, and Add to OBS preference isolation per webview profile. |
| macOS current supported release | universal 64-bit | Wails WebKit and an external browser SHALL match; unsigned-app launch is unchanged. |
| Linux supported desktop distributions | amd64 | Wails GTK/WebKit and an external browser SHALL match; existing GTK/WebKit and OBS Browser Source limitations remain documented exceptions. |
| Headless server on Windows, macOS, or Linux | release architecture | The browser admin at `/` SHALL provide the complete Studio redesign without Wails APIs. |

Font rasterization may differ; selection, copy, Publish, activate, focus, and accessible names MUST remain equivalent.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | No native file picker or new config path. Overlay asset upload stays the existing in-page file input. | Web UI has no direct filesystem access. | Existing API errors; no silent alternate storage. |
| clipboard/notifications | Copy uses the browser Clipboard API when available and the existing selectable-input fallback otherwise. No OS notifications. | Clipboard write needs a user gesture and a local/secure context. | Failed copy keeps the URL visible/selectable and reports failure. |
| tray/menu/shortcuts | Existing Wails tray/menu unchanged. No new global shortcut. | N/A | Existing tray/menu fallback remains. |
| protocol/file associations | No change. OBS sources remain HTTP URLs on the configured listen address. | N/A | Invalid URLs keep existing guidance. |
| single instance/deep open | Existing single-instance behavior unchanged. `#studio` is in-document navigation, not an OS deep link. | N/A | Unknown hashes still fall back to Live. |
| child processes/IPC | No new IPC or native bridge. UI talks to localhost HTTP/WebSocket only. | Existing bind-address trust boundary. | Copy/Publish/activate failures stay in-document. |
| sleep/wake/shutdown | Existing server and WebSocket lifecycle. Dirty Studio still warns on document unload. | N/A | After wake, reconnect as today; in-memory drafts survive only if the document did. |

## Security / Privacy / Trust Boundary

The webview and external browser remain untrusted localhost clients. This change adds no route, secret surface, or cloud call. Copyable URLs MUST NOT include OAuth tokens or proxy passwords. OBS setup outcome, Studio density/collapse state, and preview preferences are non-secret UI flags in the browser/webview profile only.

If the operator binds beyond loopback, existing exposure risk is unchanged and MUST NOT be understated.

## Not applicable areas

- Native open/save/permission dialogs outside the web document.
- OS notifications, protocol handlers, file associations, installer, auto-update, signing, firewall, startup registration.
- OBS WebSocket, scene collections, and source visibility.
- Power inhibition and background execution privileges.
- Changes to Wails window options, GPU policy, or Linux `.desktop` install.
