# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows currently supported by CommRelay desktop | Existing packaged architectures | Same SQLite grant path and localhost Live/dock UI |
| Existing headless/server hosts | Existing Go release architectures | Same uniqueness; admin and dock in an ordinary browser |
| OBS Browser Source hosts supported by current overlays | OBS Chromium | Chat highlight only; no operator award controls |

This change does not expand the OS or architecture matrix.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Reads/writes existing `comm-relay.db`. No new file picker | Existing data-directory access | Failed grant rolls back the transaction; 409 is not a disk error |
| clipboard/notifications | Unchanged | None added | N/A |
| tray/menu/shortcuts | Unchanged | None added | Like/Reward remain in-page buttons |
| protocol/file associations | Unchanged | Existing pack-import path | N/A |
| single instance/deep open | Unchanged | None added | Multiple admin/dock clients share one DB; second grant 409s |
| child processes/IPC | No native IPC | Existing loopback HTTP/WebSocket | Grant stays in-process |
| sleep/wake/shutdown | Award events persist; in-flight browser grant may 409 or fail | No power-management permission | Reload restores `granted_award_ids` from SQLite |

## Security / Privacy / Trust Boundary

- Trust boundary remains the local CommRelay process and loopback listener.
- Grant still requires `platform` + `user_id`; optional message snapshot stays transient and truncated as today.
- Logs MUST NOT include full chat bodies at Info; award id, platform, and message id only.

## Not applicable areas

- Native save/open dialogs, drag-and-drop storage, clipboard permission prompts.
- OS notifications, badges, media keys, extra accessibility APIs.
- New tray/menu commands and global shortcuts.
- Custom URL protocols, file associations, installer registry, and signing entitlements.
- Camera, microphone, screen-capture, keychain, and elevated privilege.
- Connector/OAuth permission changes.
