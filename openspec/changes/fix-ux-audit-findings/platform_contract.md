# Platform Contract
## Supported Matrix
Existing browser and packaged Wails hosts; no OS-specific behavior added.
## OS Integration
Not applicable: filesystem/dialogs, clipboard/notifications, tray/menu/shortcuts, protocol associations, single-instance handling, IPC, child processes, sleep/shutdown are untouched.
## Security / Privacy / Trust Boundary
Same-origin existing API reads and writes only. No additional permissions or secrets.
## Not applicable areas
Native integration is unchanged; browser verification does not certify packaged hosts.
