# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 11 | amd64 | Wails admin, SQLite state, media upload, and OBS alert behavior match the web contract |
| macOS | universal 64-bit | Same behavior; existing unsigned-app launch guidance is unchanged |
| Linux | amd64 | Same behavior under the supported WebKit/Wails runtime; desktop-entry behavior is unchanged |
| Current Chromium-family browser | Host architecture | Local admin behavior matches Wails when connected to the CommRelay server |

Twitch, YouTube Live, and VK Live messages use one platform-neutral greeting contract after each connector supplies a stable `platform` and `user_id`. A connector without stable identity may still deliver chat but cannot trigger greetings.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Reuse overlay-asset uploads beside `config.json`; greeting rows store generated filenames only | Existing file-picker and app-data permissions | Reject unsafe/missing files with existing catalog errors; built-in emblem/sound fallback remains usable |
| clipboard/notifications | No change | N/A | N/A |
| tray/menu/shortcuts | No change | N/A | N/A |
| protocol/file associations | No change | N/A | N/A |
| single instance/deep open | No change | N/A | N/A |
| child processes/IPC | No new process or native IPC; HTTP/WebSocket remain loopback-only | Existing listen-address policy | Reconnect with existing overlay/admin behavior |
| sleep/wake/shutdown | Persist qualification before best-effort broadcast; graceful shutdown does not replay it | No new permission | Resume/restart continues the same open session and markers |

## Security / Privacy / Trust Boundary

Greeting definitions, exclusion flags, and qualification markers remain in the local SQLite database beside configuration. No viewer identity, message, media, or greeting state is sent to a new external service. Templates are bounded plain text and render without HTML interpretation. Asset APIs accept only existing generated filenames and retain safe-type/size checks. Production `/ws` and test `/ws/overlay-debug` are distinct fail-closed audiences: preview must never reach a production OBS source, while live viewer messages never enter the debug audience through this feature. Logs and diagnostics may include greeting kind, platform, stable viewer id, and suppression reason but MUST NOT include full message text, OAuth tokens, client secrets, or local absolute media paths.

## Not applicable areas

- Native dialogs: no new dialog beyond existing browser file input.
- Clipboard and notifications: greeting setup does not copy or notify outside the admin.
- Tray/menu/shortcuts: no entry or accelerator is added.
- Protocol/file associations and deep links: no new scheme or file type.
- Single-instance coordination: unchanged because all state belongs to the existing server process.
- Child processes: no encoder, media converter, helper, or shell command is introduced.
- Elevated permissions and sandbox exceptions: not required.
- Power management: no wake lock or background OS service is added.
- Packaging/signing: no new runtime or redistributable dependency.
