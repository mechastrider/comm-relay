# Desktop App

## Purpose

Ships a Wails desktop window around the local server and installs a Linux desktop entry so the panel and menu show the CommRelay icon.

## Requirements

### Requirement: Desktop build embeds the local UI
The desktop binary SHALL start the same local HTTP/WebSocket runtime as the headless server and show the admin UI in a native webview. Config for desktop SHALL default to the user config directory rather than the current working directory.

#### Scenario: Desktop launch
- **WHEN** the operator starts the desktop binary
- **THEN** the local server becomes reachable and the window loads the admin console

### Requirement: Linux installs an XDG desktop entry on first launch
On Linux, first launch SHALL write `~/.local/share/applications/comm-relay.desktop` plus icon files under `~/.local/share/icons/hicolor/256x256/apps/` and `~/.local/share/pixmaps/`. `StartupWMClass` SHALL be `CommRelay` to match the GTK program name. The `.desktop` `Version` field SHALL remain the FreeDesktop spec version `1.0`, not the CommRelay release version.

#### Scenario: First Linux launch
- **WHEN** the desktop app starts on Linux without an existing entry
- **THEN** a `comm-relay.desktop` file and PNG icon are installed for the current user

### Requirement: Linux webview GPU policy stays explicit
When Linux Wails options are set (including icon), the desktop app SHALL keep `WebviewGpuPolicyNever` so Wails does not silently default GPU policy to Always.

#### Scenario: Linux options with icon
- **WHEN** the desktop app sets a non-nil Linux options struct
- **THEN** webview GPU policy remains Never
