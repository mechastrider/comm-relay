## Why
Issue #104: desktop message notifications stay silent until the operator clicks Test. The admin only creates audio after gestures, and Linux WebKitGTK blocks autoplay. Native JavaScript evaluation can activate audio, but the current cross-origin admin iframe does not inherit this activation.
## Users and Supported Platforms
Desktop operators on existing Linux, Windows and macOS builds. ALT Linux p11/PipeWire/X11 is the reported environment.
## What Changes
Play desktop message tones in the trusted top-level shell, activated through a narrow Wails binding. Keep existing sound presets, volume, Test and browser playback. No replay of missed sounds.
## Capabilities
### Modified Capabilities
- `admin-and-dock`: automatic desktop message audio.
## Scope / Non-Goals
Message notification sounds only; command/greeting audio, OBS, native audio libraries, Wails upgrades and forks are excluded.
## Impact
Add a validated frame-to-shell audio channel and fixed native operations. No persisted data, UI controls or distribution format changes.
