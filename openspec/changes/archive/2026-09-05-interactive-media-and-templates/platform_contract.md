# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows (project-supported) | Packaged | Web file input; overlay-assets beside config |
| Linux (project-supported) | Packaged | Identical; no extra desktop-entry |
| macOS (project-supported) | Packaged | Identical |
| Headless server | Packaged | Upload and serve via localhost HTTP |

OBS CEF must play MP3/WAV from `/overlay/assets/` on the alert page. Wails admin Play preview uses the same origin.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Read/write `overlay-assets` next to `config.json`; no native picker | Existing config-dir access | Upload 400 on type/size; in-use delete 400 |
| clipboard/notifications | Unchanged | None | Existing |
| tray/menu/shortcuts | Unchanged | None | Existing |
| protocol/file associations | No change | None | N/A |
| single instance/deep open | No change | None | Existing |
| child processes/IPC | No ffmpeg or helper process | Localhost only | Failed decode rejects upload |
| sleep/wake/shutdown | Files remain on disk | None | Alert does not replay |

## Protocol Contract

- `POST /api/overlay/assets/upload` multipart `file` + optional `kind`.
- `POST /api/overlay/assets/delete` JSON `filename`.
- Command/award create/update JSON includes `image_asset`, `sound_file`, `sound_volume`, `layout`.
- Alert WebSocket optional `image_asset`, `sound_file`, `sound_volume`, `layout`.
- `GET /overlay/assets/{filename}` may return audio as well as images.
- `streamer_display_name` on public config.

## Security / Privacy / Trust Boundary

Localhost operator trust unchanged. Generated names only. No remote media URLs from catalog fields. Upload sniffing rejects SVG/GIF/HEIC for alert images. Templates stay text.

## Not applicable areas

Native open/save dialogs, notifications, tray, protocol handlers, camera/mic, installer metadata, OBS scene control.
