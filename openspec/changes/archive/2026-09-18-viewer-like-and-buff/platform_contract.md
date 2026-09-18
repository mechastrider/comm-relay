# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows currently supported by CommRelay desktop | Existing packaged architectures | Admin/overlay/dock hosted UI only; no native social UI |
| Existing headless/server hosts | Existing Go release architectures | Same HTTP/WebSocket behavior in an ordinary Chromium-family browser |
| OBS Browser Source hosts supported by current overlays | OBS Chromium | Chat freeze + like award alerts; no new source URL |

This change does not expand the OS or architecture matrix.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Additive SQLite migration beside existing DB; additive `config.json` keys. No new file pickers | Existing data directory | Migration failure prevents startup as other Goose migrations; config default-fill on load |
| clipboard/notifications | Unchanged | None added | N/A |
| tray/menu/shortcuts | Unchanged | None added | Social commands are not global hotkeys |
| protocol/file associations | No new protocol | Existing localhost HTTP | Same as other admin/overlay routes |
| single instance/deep open | Unchanged | None added | Multiple admin clients share one ingest pipeline |
| child processes/IPC | No native IPC | Existing loopback HTTP/WebSocket | Slow overlay clients cannot block ingest |
| sleep/wake/shutdown | Quotas and buffs persist in SQLite; in-memory `command_outcome` map clears on process exit | No power-management permission | After restart, remaining quotas survive; overlay freeze state does not |

## Security / Privacy / Trust Boundary

- Trust boundary remains the local CommRelay process and loopback listener.
- No connector chat send/reply; no extra OAuth scopes.
- Nick remainder and reason labels are untrusted text; render as text nodes.
- Info logs omit chat bodies; include trigger, reason, viewer ids.
- Reward history still omits giver identity and chat text.

## Not applicable areas

- Native save/open dialogs, notifications, badges, media keys.
- New tray/menu commands and global shortcuts.
- Custom URL protocols, file associations, installer registry, signing entitlements.
- Camera, microphone, screen-capture, keychain, elevated privilege.
- Connector/OAuth permission changes.
- Second database or moving config into SQLite.
