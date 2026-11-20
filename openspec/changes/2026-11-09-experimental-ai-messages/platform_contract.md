# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|---|---|---|
| Windows, existing supported baseline | amd64 | Wails/WebView2 and OBS local audio playback; no minimum-version change |
| macOS, existing supported baseline | universal (Intel/Apple Silicon) | Existing Wails/WebKit packaging; same feature semantics |
| Linux, existing supported baseline | amd64 | Existing WebKitGTK dependencies; same feature semantics |
| Headless server on current supported targets | existing targets | Browser admin and OBS use same HTTP contracts |

Matrix is inherited from `.github/workflows/release.yml`; implementation must recheck targets at delivery time rather than introduce new support promises.

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|---|---|---|---|
| filesystem/dialogs | App-data AI audit and generated media; existing image picker | User-owned config directory; no new picker | Failed writes fail job; never emit incomplete file |
| clipboard/notifications | Existing controls only | No new permissions | Not applicable |
| tray/menu/shortcuts | Existing shell only | No additions | Not applicable |
| protocol/file associations | No new associations | None | Not applicable |
| single instance/deep open | Preserve existing process policy | No new lock/process manager | Not applicable |
| child processes/IPC | In-process HTTP clients and runnable; existing local HTTP/WS | No shell tools or child synthesizer | Cancellation bounded by context |
| sleep/wake/shutdown | Recheck deadlines after wake; cancel on shutdown | No OS power hooks required | Restart cancels nonterminal work |

## Security / Privacy / Trust Boundary

Only backend reads environment credential references; launching a desktop app must inherit configured environment (document OS-specific setup). No new credential helper/keychain dependency. No plaintext keys in exported config or browser storage. Never claim environment variables encrypt secrets; this is a minimal portable experiment contract.

Keep networking in backend: HTTPS provider calls, standard certificate verification, no credential forwarding on redirect. Custom proxy URLs are operator-controlled, not viewer-controlled. OBS reads generated media from existing same-origin asset routing; API keys never enter OBS. Failed disk access, quota, DNS or TLS leaves ordinary chat operational.

Media writes use temporary files in destination directory and atomic rename on all platforms. Remove incomplete temporary files during startup. Limit response sizes before allocation. Preserve permissions consistent with existing local data; apply restrictive file modes where supported and inherit user-directory ACLs on Windows.

## Not applicable areas

No installer privilege, browser OAuth, notification permission, clipboard integration, new native dialogs, tray behavior, protocol registration, deep links, child processes or power API. This feature does not alter microphone/system-audio capture permissions: it synthesizes remote audio and plays local files.
