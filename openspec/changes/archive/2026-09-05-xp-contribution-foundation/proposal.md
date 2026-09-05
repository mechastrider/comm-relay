## Why

Chat lines currently add `points_per_message` (default 1) to a single `score` on every counted message. That rewards volume, not contribution. Interactive System v1 asked for Session Score, Persistent XP, and Credits as three wallets. For this slice that is too much: Credits have nowhere to spend, and a second contribution currency would duplicate the session/day/all windows we already have. Operators need one progress number, a flood-safe activity rule, and a richer starting award catalog they can grant from Live and the dock.

## Users and Supported Platforms

Stream operators and viewers on Twitch, YouTube Live, and VK Live. The same localhost HTTP/WebSocket contract serves the headless server, Wails desktop admin, OBS dock, and Browser Sources (`/overlay/leaderboard`, `/overlay/alert`). No OS-specific API is added.

## What Changes

- Rename the contribution counter from `score` to `xp` in operator UI and public JSON. Session, day, and all-time remain time windows of that one number. Stored totals are kept, not split or reset.
- Stop granting XP on every message. Replace `points_per_message` with a silent activity policy: at most one grant per interval, capped per stream session, writing the same XP into all three current windows. No overlay alert.
- Seed additional deletable award types (`spotter`, `intel`, `expert`, `meme`, `clutch`, `mvp`) without resurrecting awards the operator already deleted. Joke and Advice stay as they are. Award `points` remain the XP granted on a manual Reward.
- Commands still never change XP. Message count is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `viewer-stats`: XP windows, activity grants, merge/new-stream behavior.
- `config-store`: persist activity settings; retire `points_per_message` as the progress rule.
- `operator-rewards`: grant XP; additive catalog seeds.
- `chat-commands`: commands must not change XP.
- `interaction-events`: log silent activity grants.
- `websocket-feed`: leaderboard snapshots use `xp`.
- `obs-leaderboard`: rank and label by XP.
- `admin-and-dock`: Audience/Live/Settings copy and sort use XP; activity fields.

## Scope / Non-Goals

No Credits, levels, achievements, Reward Library, command media/templates, community awards, or rules engine. No full chat archive. Activity is not a Reward-picker type and does not play an alert.

## Impact

SQLite migrates `score` columns to `xp` and adds per-session activity counters. `config.json` gains activity fields; existing `points_per_message` is ignored and no longer applied. Admin, dock, and leaderboard payloads switch to `xp` (no `score` alias). Streamer-visible changelog is required. Packaging, OS integration, and overlay alert layout are unchanged.
