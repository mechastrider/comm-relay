# Platform Contract
## Supported Matrix
Existing Linux/Windows/macOS architectures. Linux uses native evaluation for the shell audio context. macOS also enables the existing autoplay preference. Browser mode retains browser policies.
## OS Integration
IPC exposes preparation and validated tone playback only. No user JavaScript evaluation. React cleanup disconnects its port; shell unload releases audio. Repeated preparation is idempotent.
## Security / Privacy / Trust Boundary
Only the configured loopback admin frame may negotiate playback. Wrong origin/source, malformed tone and non-finite/out-of-range volume must not play. No credentials or message text crosses the audio bridge.
## Not applicable areas
Filesystem/dialogs, clipboard, notifications, tray/menu/shortcuts, associations, single instance, child processes and persistence are unchanged.
