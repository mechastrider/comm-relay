# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Existing server and Wails supported targets | Existing supported architectures | Local SVG/DOM rendering and same local API; no new platform dependency |

## OS Integration

Config and SQLite use existing paths, permissions and migration lifecycle. Browser timers recover on wake through fresh status lookup. Page unload cancels pending reads. No background helper processes.

## Security / Privacy / Trust Boundary

No remote image/font fetches, platform messaging or credential access. Bounded local status reads and allowlisted emblem ids only. Existing localhost API protection applies.

## Not applicable areas

Filesystem dialogs, clipboard, notifications, tray/menu, shortcuts, protocol/file associations, single-instance/deep-open, native IPC, process launch, power management and installer permissions are unchanged because this change uses existing web views and storage only.
