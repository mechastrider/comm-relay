# Platform Contract
## Supported Matrix
Existing browser and packaged Wails platforms remain supported; no OS-specific implementation added. Chromium provides development evidence, not native WebView certification.
## OS Integration
Filesystem/dialogs, clipboard, notifications, tray/menu/shortcuts, protocol/file associations, single instance, deep open, child processes/IPC, sleep/wake/shutdown: unchanged; no new permissions or recovery paths.
## Security / Privacy / Trust Boundary
Unchanged. Test using disposable local data and disabled connectors.
## Not applicable areas
All OS integrations listed above are outside this presentation-only change. Native control appearance is normalized via existing web CSS.
