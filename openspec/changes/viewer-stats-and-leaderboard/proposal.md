## Why

Streaming MVP is done, but CommRelay still forgets every viewer when the process stops. Streamers need durable per-viewer counts, a way to merge the same person across platforms, and a second OBS panel for a leaderboard. JSON config cannot hold growing identity and stats; this is the first slice of the post-MVP event horizon (roadmap phase 6a), without chat commands.

## What Changes

- Add a local SQLite file beside `config.json`, migrated on process start with Goose (`pressly/goose/v3`) and a pure-Go driver (`modernc.org/sqlite`). **Do not** move operator settings or secrets into SQLite.
- On each ingested chat line with a stable `(platform, user_id)`, upsert a viewer identity and increment `message_count` and `score` (score from a configurable points-per-message value, default 1).
- Support explicit admin merge of two viewers; stats add together. No auto-merge by nick. No unmerge in this change (audit the merge).
- Track three independent leaderboard periods: current **session** (New stream button, with confirm), **day** (configurable reset hour, default 06:00 local, not midnight), and **all-time**.
- Admin: Monitor / Viewers switch on the main canvas (list, search, card, merge). New stream in the header. Day-reset and points-per-message in Interface. OBS setup gains a leaderboard Browser Source card.
- New transparent OBS page `/overlay/leaderboard` with `period` query; live updates over `/ws`. Chat `/overlay` stays unchanged.
- Chat commands, `/overlay/alert`, and a generic event-action engine are **out of scope**.

## Capabilities

### New Capabilities

- `viewer-stats`: identities, canonical viewers, counters, merge, sessions, day buckets, admin people workspace, related APIs
- `obs-leaderboard`: `/overlay/leaderboard` Browser Source, periods, live ranking

### Modified Capabilities

- `local-runtime`: open SQLite next to config; Goose up on start; refuse to run if migrate fails
- `config-store`: persist `points_per_message` and day-reset hour; keep JSON for operator settings
- `http-api`: POST-action viewer/session mutations; GET list, card, leaderboard
- `admin-and-dock`: Monitor/Viewers canvas, New stream, OBS leaderboard URL; dock unchanged
- `websocket-feed`: broadcast leaderboard snapshots (chat clients ignore unknown types)

## Impact

- New packages: store, Goose SQL under embed, stats subscriber on the bus
- Admin HTML/CSS/JS: main-canvas tabs, viewers split pane, header control, OBS setup card, Interface fields
- New static page `web/` for leaderboard overlay
- Dependencies: `modernc.org/sqlite`, `pressly/goose/v3`
- Desktop/server: `comm-relay.db` beside the existing config path
- CHANGELOG: streamer-visible (viewers, merge, leaderboard, New stream)
