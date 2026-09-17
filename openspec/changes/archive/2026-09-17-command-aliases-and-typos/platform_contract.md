# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows currently supported by CommRelay desktop | Existing packaged architectures | Same SQLite catalog and localhost admin editor |
| Existing headless/server hosts | Existing Go release architectures | Same matcher; admin in an ordinary browser |
| OBS Browser Source hosts supported by current overlays | OBS Chromium | Overlay shows typed chat; no alias editor |

This change does not expand the OS or architecture matrix.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Goose migration writes `command_aliases` inside existing `comm-relay.db` beside config. No new file picker | Existing data-directory access | Failed migration prevents startup as other Goose versions; empty table is valid |
| clipboard/notifications | Unchanged | None added | N/A |
| tray/menu/shortcuts | Unchanged | None added | Aliases are chat catalog data, not OS shortcuts |
| protocol/file associations | `pack.yaml` `aliases` is pack-import data, not a new file type | Existing pack-import path | Invalid aliases fail apply with a field/pack error; catalog unchanged |
| single instance/deep open | Unchanged | None added | Multiple admin clients share the same DB |
| child processes/IPC | No native IPC | Existing loopback HTTP/WebSocket | Matcher stays in-process |
| sleep/wake/shutdown | In-memory cooldown unchanged | No power-management permission | Restart clears cooldown as today; aliases persist |

## Security / Privacy / Trust Boundary

- Trust boundary remains the local CommRelay process and loopback listener.
- Alias slugs use the existing `[a-z0-9_]{1,32}` alphabet; no URLs or paths.
- Logs MUST NOT include full chat bodies at Info; canonical `trigger` only.

## Not applicable areas

- Native save/open dialogs, drag-and-drop storage, clipboard permission prompts.
- OS notifications, badges, media keys, extra accessibility APIs.
- New tray/menu commands and global shortcuts.
- Custom URL protocols, file associations, installer registry, and signing entitlements.
- Camera, microphone, screen-capture, keychain, and elevated privilege.
- Connector/OAuth permission changes.
