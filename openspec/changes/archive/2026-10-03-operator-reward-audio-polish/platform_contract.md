# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Existing supported Windows desktop | Existing release architectures | WebView plays command audio; gesture recovery if required |
| Existing browser admin hosts | Existing supported browsers | Same behavior subject to browser autoplay policy |

## OS Integration

Audio uses browser/WebView media APIs and the current system output. No microphone access, new permission, native bridge, or child process. Dispose playback on app/page shutdown. Reconnection after sleep accepts live events without restoring historical sounds.

## Security / Privacy / Trust Boundary

Reuse safe same-origin overlay asset URLs. Do not accept arbitrary URLs or record audio. The setting is non-sensitive and stored with other local preferences.

## Not applicable areas

Filesystem dialogs, clipboard, notifications, tray/menu/shortcuts, file/protocol associations, single-instance/deep-open behavior, native IPC, sandbox entitlement changes, and installer privileges are unaffected because this is an existing web UI and config feature.
