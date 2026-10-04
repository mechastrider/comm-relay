## Why

The operator-facing term “Contracts” obscures the viewer reward workflow. Command audio currently plays only in the alert overlay, so the streamer cannot reliably hear command voice clips from the application. The leaderboard ranking is bottom-aligned even when the OBS rectangle has spare height.

## Users and Supported Platforms

Streamers using the existing Windows Wails application or browser admin and OBS Browser Sources. No supported-platform expansion.

## What Changes

- Rename the Live section and associated interface copy to “Зрительские награды” / “Viewer rewards”, retaining existing reward rules and stored identifiers.
- Add a saved, default-enabled “Play command sounds in the app” setting independent of message notification sounds. Play existing command clips or tones at their configured volume throughout admin navigation.
- Align ranking content to the top of the leaderboard source, preserving theme padding, responsive fitting, and panel/chips layouts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-and-dock`: viewer reward terminology and operator command audio.
- `config-store`: default-enabled command audio preference with upgrade-safe persistence.
- `obs-leaderboard`: top-aligned ranking content.

## Scope / Non-Goals

Include existing custom audio (including spoken recordings), built-in tones, localization, lifecycle cleanup, and relevant regression checks. Exclude speech synthesis, OS audio routing, dock playback, new reward mechanics, API/DB identifier renaming, and exact synchronization between independent OBS and admin clients.

## Impact

React admin, shared locale catalogs, Go config and config update compatibility, existing alert audio/scheduling helpers, leaderboard CSS, tests, canonical specs, and Russian changelog. One additive non-sensitive JSON preference; no database migration, native permissions, packaging changes, or external services.
