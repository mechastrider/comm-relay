# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows supported release targets | Any currently packaged architecture | Wails/admin and OBS dock share localhost state; system sleep may advance deadlines while suspended |
| macOS supported release targets | Any currently packaged architecture | Same localhost API/WebSocket behavior in supported OBS packages |
| Linux supported release targets | Any currently packaged architecture | Same behavior in supported OBS packages and external browser admin |

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Visibility policy stays in existing `config.json`; command action uses existing SQLite database | Existing user-config directory access only | Atomic config save and migration startup rules remain |
| clipboard/notifications | Existing URL copy only; no visibility notifications | Existing browser clipboard rules | Current fallback remains |
| tray/menu/shortcuts | No change | N/A | N/A |
| protocol/file associations | Existing localhost routes plus localhost JSON control routes | No registration | Reconnect/read state recovers |
| single instance/deep open | One running process owns one runtime state | Existing single-process expectation | Restart reconstructs from policy and clears overrides |
| child processes/IPC | No native IPC or child process; HTTP/WebSocket inside local process | Loopback trust boundary | UI reports unreachable controller safely |
| sleep/wake/shutdown | Deadlines use absolute time and controller respects context cancellation | No extra permission | On wake, expired timed state resolves hidden; shutdown cancels timers |

## Security / Privacy / Trust Boundary

Mutating routes remain intended for loopback use and accept only enums and bounded durations. Viewer commands can request only a timed display and reuse per-viewer cooldown; they cannot alter config, pin/hide, activate presets, or pass HTML. Visibility frames contain no chat text, secret, token, or filesystem path.

## Not applicable areas

No OS-level OBS automation, source visibility API, window capture, notification permission, tray/menu integration, global hotkey, URL scheme, file association, native dialog, packaging entitlement, connector credential, or cloud service is added.
