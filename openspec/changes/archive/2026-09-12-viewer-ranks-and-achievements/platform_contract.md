# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 11 | amd64 | Packaged Wails/WebView2, external browser admin, and OBS Browser Source SHALL share the same local progression state and rendering behavior |
| macOS current supported release | universal 64-bit | Packaged Wails/WebKit and external browser SHALL match; existing unsigned/not-notarized launch behavior is unchanged |
| Linux supported desktop distributions | amd64 | Packaged Wails/GTK-WebKit and external browser SHALL match; existing GTK/WebKit and OBS CEF/GPU limitations remain documented exceptions |
| Headless server on Windows, macOS, or Linux | packaged release architecture | The browser admin and OBS URLs SHALL provide the complete feature without Wails APIs |

Twitch, YouTube Live, and VK Live feed the same canonical viewer facts. No platform connector gains a progression-specific branch, scope, permission, or API call.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Progression tables use the existing SQLite database beside `config.json`; `show_viewer_titles` uses the existing atomic config write | Existing per-user application-data access only; no file chooser | Migration/bootstrap failures use existing startup diagnostics and MUST preserve the pre-migration database transactionally |
| clipboard/notifications | Existing OBS URL copy is unchanged; progression uses only the in-page alert Browser Source | No native notification permission | Clipboard failure follows existing copy fallback; no OS notification is attempted |
| tray/menu/shortcuts | No change | None | Existing behavior remains |
| protocol/file associations | No change | None | Existing behavior remains |
| single instance/deep open | No change | None | Existing behavior remains |
| child processes/IPC | No child process or native IPC; HTTP/WebSocket remain on the configured local address | Existing localhost/network boundary | Slow or disconnected webviews/OBS clients use bounded queues and reconnect; durable progression is not rolled back |
| sleep/wake/shutdown | Live facts commit through existing SQLite transactions; backfill observes application cancellation | No new power permission | Interrupted reconciliation resumes idempotently after restart; missed overlay alerts are not replayed |

## Security / Privacy / Trust Boundary

- Viewer progression, rule catalogs, unlock timestamps, and opt-outs remain in the existing local application-data directory. No cloud synchronization or telemetry is added.
- The existing configured listen address is the only HTTP/WebSocket exposure. This change adds no authentication or remote-access promise; operators who expose that address inherit the current trust model.
- API payloads use bounded strings, allowlisted metric ids, numeric limits, and stable generated ids. They never return database paths, config paths, secrets, or raw historical chat text.
- Locked secret achievements are filtered server-side from viewer progress responses; hiding them only in JavaScript is insufficient.
- Debug preview uses the existing overlay-debug audience and cannot write viewer, catalog, counter, or history state.
- UI and overlays render operator-defined strings as text. No HTML/script interpolation, remote image URL, or new uploaded asset class is accepted.

## Not applicable areas

- Native file dialogs and custom media: no progression upload is added.
- OS notifications, badges, taskbar/dock integration, tray and menu commands: on-stream recognition stays in `/overlay/alert`.
- Clipboard: no new URL or copy action is required.
- Protocol handlers, file associations, deep links, and single-instance routing: no new entry point exists.
- Connector OAuth/scopes and platform moderation APIs: metrics consume already normalized local facts.
- Linux `.desktop` installation, Wails window options, WebView GPU policy, code signing, notarization, entitlements, installer privileges, and auto-update channels: packaging shape is unchanged.
- External services, background daemons, subprocesses, ports, firewall rules, and cloud data retention: none are introduced.
