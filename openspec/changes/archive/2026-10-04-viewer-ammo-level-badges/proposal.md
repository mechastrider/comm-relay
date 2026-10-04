## Why

Viewers cannot see their remaining like/buff uses in chat, and progression titles lack a compact visual identity. The operator approved the standalone ammo/level mockup and requested implementation with default-enabled display switches.

## Users and Supported Platforms

Stream viewers and operators using the local browser admin, OBS sources, and Wails shell on existing supported platforms. Viewer identity remains platform-neutral.

## What Changes

- Show an editable level emblem by chat names and in leaderboard rows and viewer details.
- Show independent like/buff remaining session uses at the right of chat headers and as exact counts in viewer details. Draw up to eight individual cartridges; larger capacities use a fixed magazine symbol and remaining/total text.
- Add independent default-enabled per-preset chat switches for level emblems and ammunition, plus a default-enabled leaderboard emblem switch.
- Provide server-authoritative state, including restoration and updates after relevant mutations; errors must not turn unknown state into a full magazine.

## Capabilities

### New Capabilities

- `viewer-visual-status`: Shared rank emblems and compact session ammunition presentation.

### Modified Capabilities

None separately: the additive contract across viewer progression, chat, leaderboard, Studio, Audience and HTTP is consolidated in `viewer-visual-status`. Existing gameplay requirements remain unchanged.

## Scope / Non-Goals

Scope is chat overlay, leaderboard, Audience and their configuration and preview. No new XP, quota, cooldown, award eligibility, or platform response rules. No external images or new OBS source. Live Messages/dock and level-up alert artwork are outside the first implementation volume agreed before mockups.

## Impact

Additive API data and config fields; one local SQLite migration for level emblems. Existing configuration enables the new visuals by default but explicit false values survive save/load. No new permissions, IPC, installer or updater behavior. Bundled static assets and React admin ship with the usual binary build.
