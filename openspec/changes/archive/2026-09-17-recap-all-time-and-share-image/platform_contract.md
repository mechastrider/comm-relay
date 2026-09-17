# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows currently supported by CommRelay desktop | Existing packaged architectures | Recap dialog download uses the WebView download path; overlay unchanged |
| Existing headless/server hosts | Existing Go release architectures | Admin in an ordinary Chromium-family browser downloads the PNG; no native desktop API |
| OBS Browser Source hosts supported by current overlays | OBS Chromium | Overlay stays transparent and does not download files |

This change does not expand the OS or architecture matrix.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | No new app data files. PNG is a user-initiated browser/WebView download to the host default download location. No save/open file picker is added | Existing download permission of the hosted page only | Encode/download failure stays in the Recap dialog; recap visibility unchanged |
| clipboard/notifications | Clipboard image copy is not required. Existing URL copy affordances are unchanged. No notification | None added | N/A for PNG clipboard |
| tray/menu/shortcuts | Unchanged | None added | Recap window is never inferred from tray lifecycle |
| protocol/file associations | No new protocol or file type | Existing localhost HTTP | Same as other admin/overlay routes |
| single instance/deep open | Unchanged | None added | Multiple admin clients share the same recap controller |
| child processes/IPC | No native IPC. PNG is encoded in the admin page | Existing loopback HTTP/WebSocket | Slow overlay clients cannot block show-all |
| sleep/wake/shutdown | Visibility remains in-process; restart hides every window | No power-management permission | Reconnect restores last window until process restart |

## Security / Privacy / Trust Boundary

- Trust boundary remains the local CommRelay process and loopback listener.
- All-time presentation exposes the same public-safe ranking fields as the existing all-time leaderboard plus aggregate counts. No chat text, credentials, or filesystem paths.
- Share PNG is generated locally from that public DTO. The server does not receive the image bytes.
- Overlay remains unable to initiate downloads. Admin encode must not follow `javascript:` or data portraits outside existing portrait URL rules.

## Not applicable areas

- Native save/open dialogs, drag-and-drop storage, and user-selected export directories: browser/WebView download is sufficient.
- OS notifications, badges, media keys, and extra accessibility APIs outside the hosted page.
- New tray/menu commands and global shortcuts.
- Custom URL protocols, file associations, installer registry, and signing entitlements.
- Camera, microphone, screen-capture, clipboard-image permission prompts, keychain, and elevated privilege.
- Screen capture of OBS: explicitly forbidden; encode from presentation data only.
- Connector/OAuth permission changes.
- SQLite path or second database.
