# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows 11 | amd64 | Wails/WebView2 and headless builds expose the same contract API, admin flow, SQLite migration, and embedded alert assets |
| macOS supported by current release | universal 64-bit (amd64/arm64) | Same behavior through the packaged Wails webview; no entitlement or signing change |
| Linux distributions supported by current release | amd64 | Same behavior through WebKitGTK and headless build; existing OBS hardware-acceleration caveats remain |
| OBS Browser Source on supported hosts | OBS-provided CEF | Contract alerts and the persistent leaderboard card remain transparent and responsive; no platform-specific frame fields or logic |

Viewer eligibility is platform-neutral: canonical viewers originating from Twitch, YouTube Live, VK Live, or merges are treated identically. Connector availability or failure does not affect an already active contract or its ability to settle against a durable viewer.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Existing startup opens and migrates the SQLite database beside the configured data path; no native dialog or new path | Existing user-data-directory write access only | Migration failure prevents normal store startup with logged error; active state survives process restart after commit |
| clipboard/notifications | No new clipboard or OS notification behavior | None | Not applicable |
| tray/menu/shortcuts | Existing application menu/tray/global-shortcut behavior is unchanged | None | Not applicable |
| protocol/file associations | Existing localhost `http`/`ws` URLs only; no scheme or file association | Existing loopback access | API/WS failure is shown as local-server error with retry |
| single instance/deep open | No new single-instance or deep-link contract | None | Concurrent browser/webview clients rely on SQLite lifecycle conflicts and reload authoritative state |
| child processes/IPC | No child process or native IPC; browser/webview talks to the in-process localhost HTTP/WebSocket server | Existing loopback boundary | A dropped announcement is recoverable with Announce again; the persistent card restores from a state snapshot |
| sleep/wake/shutdown | No timer or background worker; committed active state remains in SQLite while display overrides stay process-local | None beyond current database access | After wake/restart, admin reads the current contract and the shared OBS surface defaults to the visible objective; the alert is not replayed |

The migration must be compatible with Windows file locking and the existing single SQLite connection/WAL settings. It MUST NOT move settings from `config.json`, create a second database, or write contract text to release/install locations.

## Security / Privacy / Trust Boundary

All new reads/actions use the existing loopback server trust model and same-origin browser calls. Operator-authored title/objective, viewer id, and reward id remain local. The system sends contract content only to connected local production `/ws` clients, never connectors or cloud services. Contract text is JSON encoded and rendered as text; ids are resolved server-side. Logs exclude title/objective and credentials. Custom media remains restricted to already validated generated filenames and the existing `/overlay/assets/` serving boundary.

No new camera, microphone, accessibility, keychain, notification, firewall, browser-launch, or elevated filesystem permission is required on any OS. Existing unsigned-build and Linux WebKit/OBS caveats are unchanged.

## Not applicable areas

- Native file/open/save dialogs: no file is selected by this workflow.
- Clipboard, notifications, tray, menus, shortcuts, protocol/file associations, deep links, and startup registration: no new entry point is needed.
- Child processes and external IPC: announcement stays on the existing in-process WebSocket hub.
- Connector OAuth/scopes and platform APIs: no platform message is sent and no new viewer data is fetched.
- Power management/background execution: no deadlines or scheduled work are introduced.
- Installer/package contents and code signing: existing binary and embedded-web packaging already carry the changed code and assets.
