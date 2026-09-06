## Why

The OBS leaderboard currently keeps a fixed CSS-pixel font while the Browser Source viewport changes, so resizing the source reflows the panel without scaling its typography and chrome as one composition. Its fixed row cap is the primary density control even though source height is the more direct way to choose how many ranks fit. Custom titles also replace a theme-owned pseudo-element with a separate oversized heading, and the compact `xp · messages` line gives the secondary message count the same weight as XP.

## Users and Supported Platforms

Streamers and OBS operators using the local web admin, Wails desktop shell, and OBS Browser Source on Windows, macOS, or Linux. Connector behavior is unchanged for Twitch, YouTube, and VK.

## What Changes

- Scale leaderboard typography, avatars, spacing, and chrome coherently from the available source width, with bounded theme-aware sizing.
- Fit only complete rows into the available source height, up to the configured `max_entries` safety cap.
- Replace the title's implicit CSS fallback with explicit `theme`, `custom`, and `hidden` modes rendered through one theme-styled title slot.
- Make XP the dominant row metric and hide message count by default, with an optional secondary display.
- Keep fixed font sizing and URL overrides as an advanced compatibility path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `obs-leaderboard`: Responsive sizing, height-based row fitting, title semantics, and XP-first row anatomy.
- `config-store`: Persist and validate leaderboard sizing, title-mode, and message-count presentation options.
- `admin-and-dock`: Replace primary pixel controls with auto-sizing and explicit title/content choices in Studio.

## Scope / Non-Goals

Visibility automation, viewer commands, dock show/hide controls, ranking order, XP accrual, periods, and theme ids are unchanged. `max_entries` remains an upper bound (default 5) so existing presets do not suddenly expose more viewers. Chat and alert surface typography is not redesigned.

## Impact

Changes are limited to overlay preset configuration, Studio, and `/overlay/leaderboard`. No SQLite migration, connector change, new permission, secret, native IPC, or packaging format is introduced. The transparent OBS page and existing pinned/follow-active URLs remain compatible; explicit `font_size_px` query overrides retain fixed-size behavior. README guidance and the Russian `[Unreleased]` entry must describe the new OBS sizing model.
