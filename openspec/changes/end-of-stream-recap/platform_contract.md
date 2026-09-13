# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows versions currently supported by CommRelay desktop | Existing packaged architectures | Wails Live/Studio and localhost OBS recap behavior match the web contract; no new WebView or OS capability is required |
| Existing headless/server hosts | Existing Go release architectures | Admin and `/overlay/recap` work through the configured localhost HTTP server; native desktop affordances are absent as today |
| OBS Browser Source hosts supported by the current overlays | OBS-provided Chromium runtime | Dedicated recap page is transparent while hidden and responsive to the configured source rectangle |

This change inherits the project's existing support matrix rather than expanding it. It introduces no OS-version or architecture-specific branch.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | SQLite migrations and recap snapshots use the existing data database; recap appearance remains in the existing `config.json`; no file picker or new path is exposed | Existing application data-directory access only | Migration failure prevents normal startup through existing handling; no partial schema or config rewrite is accepted |
| clipboard/notifications | Existing admin copy affordance copies follow-active or pinned recap URLs; no notification is emitted | Existing browser/Wails clipboard capability and its current fallback only | Copy/open failures use existing UI feedback and never affect recap state |
| tray/menu/shortcuts | Existing tray/menu/shortcut behavior is unchanged | None added | No recap state is inferred from tray/menu lifecycle |
| protocol/file associations | Local HTTP `/overlay/recap` is an ordinary served route, not a registered OS protocol or file association | Existing localhost listener boundary | An unavailable listener behaves like other admin/overlay routes |
| single instance/deep open | Existing desktop single-instance behavior, if present, is unchanged; recap URLs are opened/copies through existing mechanisms | None added | A second client may control the same server through concurrency-safe HTTP actions |
| child processes/IPC | No child process or native IPC is added; Wails and browsers use the existing localhost HTTP/WebSocket contracts | Existing loopback network access | Slow/disconnected clients cannot block Show/Hide; reconnect receives current in-process state |
| sleep/wake/shutdown | Visibility remains an in-process state across WebSocket reconnects but is not persisted across process restart; durable snapshots survive | No power-management permission | Wake/network recovery reconnects; shutdown/restart starts hidden and never unexpectedly covers the stream |

## Security / Privacy / Trust Boundary

- The trust boundary remains the local CommRelay process and its existing loopback HTTP/WebSocket listener. No firewall rule, remote listener, cloud endpoint, connector scope, or OAuth permission is added.
- The database stores aggregate session facts, nullable session attribution, and a bounded public recap snapshot. It stores no new raw chat text, secret credential, filesystem path, or external account permission.
- Snapshot and history DTOs expose only public-safe display fields. Server code validates ids, limits, cursors, snapshot versions, and bounded payloads before crossing the WebSocket/browser boundary.
- OBS and admin clients are untrusted renderers: authored text is emitted as data and inserted as text; portrait/resource URLs follow existing local-name and HTTP(S) validation.
- Runtime visibility is deliberately ephemeral. Crash or process restart cannot resurrect a visible recap; durable data is available only through local history and a new explicit Show of the current session.
- Database migration/backfill never guesses session ownership where stored timestamps are ambiguous. Null attribution is safer than a false historical claim.

## Not applicable areas

- Native filesystem dialogs, save/open panels, drag-and-drop, and user-selected storage locations: no export/import or asset selection is added.
- OS notifications, badges, taskbar progress, media controls, and accessibility APIs outside the hosted web content: the feature is controlled inside Live and rendered in OBS.
- New tray/menu commands and global shortcuts: omitted to keep irreversible first capture behind the explicit Live confirmation.
- Custom URL protocols, file associations, deep links, shell registration, and installer registry changes: `/overlay/recap` is an existing-server HTTP route.
- New single-instance coordination, named pipes, sockets, subprocesses, or desktop IPC: existing localhost HTTP/WebSocket coordination is sufficient.
- Camera, microphone, screen-capture, location, keychain, elevated privilege, or sandbox entitlement changes: recap uses already stored aggregate data.
- OS-specific sleep inhibitors, startup agents, services, or crash reporters: existing process lifecycle applies; restart intentionally hides recap.
- Connector/platform permission changes: Twitch, YouTube Live, and VK Live continue to produce the same normalized events before session attribution.
