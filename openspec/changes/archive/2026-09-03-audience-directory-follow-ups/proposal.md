## Why

The Audience directory still treats merged viewers as a last-seen platform, hides the card behind Actions or double-click, and cannot sort Score or Messages. After a stream, operators need a readable people table: every linked platform at a glance, one-click inspection, and a stable sort that survives reopening the console.

## Users and Supported Platforms

Stream operators using the admin at `/` in a browser or the Wails desktop WebView. Viewer identities may come from Twitch, YouTube Live, and VK Live; the table shows unique platform ids already stored on the canonical viewer. Overlay, dock, and packaged installers are unchanged.

## What Changes

- `GET /api/viewers` includes unique platform ids for each canonical viewer. Full identities stay on `GET /api/viewers/get`.
- Audience table headers get a distinct surface. Score and Messages become sort buttons with visible direction and `aria-sort`. Default order remains last activity; the first click on a numeric column sorts descending. Column and direction persist in the current browser or WebView, not in SQLite or `config.json`.
- A single click on a row (wide inspector, compact sheet) opens the viewer card. The display name is the accessible control. Enter and Space open the same card. The Actions column is removed; a decorative chevron may remain.
- The Platforms column shows compact SVG icons for unique platforms, each with an accessible name and tooltip, not color-only and not a permanent text label.
- Audience New stream stays a confirmed hot action and is visually separated from period/search filters.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `viewer-stats`: Viewer list summaries include unique platform ids without embedding full identities.
- `admin-and-dock`: Audience directory sorting, row activation, platform icons, header hierarchy, and New stream placement.

## Scope / Non-Goals

No Score/XP/Credits, extra award seeds, avatars, tab-taxonomy restyle, overlay/dock, saved messages, live refresh of the full directory from leaderboard snapshots, native menus, or packaging changes.

## Impact

- Additive `platforms` array on `GET /api/viewers`. Older clients ignore it. `GET /api/viewers/get`, merge, sessions, score, and leaderboard snapshots are unchanged.
- Touches `internal/store` list query, `internal/api` viewer list JSON, Audience table JS/CSS, and RU/EN catalogs.
- Streamer-visible admin UX: update `CHANGELOG.md` under `[Unreleased]`.
- Local sort preference uses existing WebView `localStorage`. No SQLite or `config.json` migration. OS integration and installers are unaffected.
