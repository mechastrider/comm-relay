# Platform Contract

## Supported Matrix
| OS/version | Architecture | Required behavior / exception |
|---|---|---|
| Windows | amd64 | Existing Wails/WebView2 runtime and PNG save |
| macOS | universal | Existing Wails runtime and PNG save |
| Linux | amd64 | Existing Wails runtime, GPU policy, desktop entry and PNG save |

Native QA is performed only in available environments and cannot be inferred from Playwright.

## OS Integration
| Area | Contract | Permissions/sandbox | Failure/recovery |
|---|---|---|---|
| filesystem/dialogs | Existing DesktopAPI.SavePNGFile through centralized helper | Existing native save permission | Cancel without browser fallback; report errors |
| clipboard | Copy existing OBS URLs | Browser permission | Existing fallback and feedback |
| IPC | Wails shell retains runtime; exact loopback admin frame receives a one-shot PNG MessageChannel | Validate source frame, exact origin and bounded string arguments | Propagate native cancel/error without browser fallback; standalone browsers retain downloads |
| lifecycle | React cleans listeners/timers; WS reconnects | Unchanged | Restore runtime state after reconnect |

## Security / Privacy / Trust Boundary
No new privileged IPC, production test API, external service, or data exposure. Render untrusted strings safely. E2E uses disposable local data.

## Not applicable areas
Tray/menu, notifications, protocol/file associations, single-instance behavior, subprocess policy, OS install entries and shutdown semantics are unchanged by the frontend migration.
