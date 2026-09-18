# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows currently supported by CommRelay desktop | Existing packaged architectures | Same SQLite catalog and localhost Live/dock UI |
| Existing headless/server hosts | Existing Go release architectures | Same bootstrap; admin and dock in an ordinary browser |
| OBS Browser Source hosts supported by current overlays | OBS Chromium | Alert and chat highlight only; no operator Like control |

This change does not expand the OS or architecture matrix.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Bootstrap writes award/achievement rows inside existing `comm-relay.db` beside config. No new file picker | Existing data-directory access | Failed bootstrap prevents startup like other catalog seeds; existing rows stay |
| clipboard/notifications | Unchanged | None added | N/A |
| tray/menu/shortcuts | Unchanged | None added | Like/Reward are in-page buttons, not OS shortcuts |
| protocol/file associations | Unchanged; no pack.yaml requirement | Existing pack-import path | Packs may mention `on_point` only if the operator authors it |
| single instance/deep open | Unchanged | None added | Multiple admin/dock clients share the same DB |
| child processes/IPC | No native IPC | Existing loopback HTTP/WebSocket | Grant stays in-process |
| sleep/wake/shutdown | Catalog rows persist; in-flight browser grant may fail and retry | No power-management permission | Restart does not recreate deleted seeds |

## Security / Privacy / Trust Boundary

- Trust boundary remains the local CommRelay process and loopback listener.
- Grant still requires `platform` + `user_id`; optional message snapshot stays transient and truncated as today.
- Logs MUST NOT include full chat bodies at Info; award id and viewer id only.

## Not applicable areas

- Native save/open dialogs, drag-and-drop storage, clipboard permission prompts.
- OS notifications, badges, media keys, extra accessibility APIs.
- New tray/menu commands and global shortcuts.
- Custom URL protocols, file associations, installer registry, and signing entitlements.
- Camera, microphone, screen-capture, keychain, and elevated privilege.
- Connector/OAuth permission changes.
