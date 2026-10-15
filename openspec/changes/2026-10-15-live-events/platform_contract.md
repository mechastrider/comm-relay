# Platform Contract
## Supported Matrix
Existing browser/admin and Wails support matrix unchanged. No platform-specific behavior.
## OS Integration
Existing SQLite location and server lifecycle. Abort frontend polling on unmount; recover by durable read after wake or restart.
## Security / Privacy / Trust Boundary
Same-origin GET exposes curated event fields only. No full chat text, source message references or secrets.
## Not applicable areas
No filesystem dialogs, clipboard, notifications, tray/menu, protocol associations, deep links, new processes/IPC or permissions. Feature uses existing HTTP and database boundaries.
