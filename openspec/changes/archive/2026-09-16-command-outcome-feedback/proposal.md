## Why

A viewer can send `!gg` and get silence: cooldown suppressions never leave ingest except as a Debug log, while `/ws` already tags the line `is_command` from a lookup that does not know whether the command actually fired. Operators cannot tell accepted commands from frozen ones, and the overlay cannot show a short “on cooldown” beat.

## What Changes

- Decide `fired` vs `cooldown` once per matched enabled command and broadcast a `/ws` `command_outcome` frame (`message_platform`, `message_id`, `trigger`, `status`, `cooldown_remaining_ms`).
- Keep `Lookup` on the hub for `is_command`; consume cooldown only in ingest (`TryFire` must not run in both places).
- Overlay chat: cooldown lines appear as a frozen row with no live timer and a fixed ~5 s visibility (not a Studio slider).
- Add an operator flag next to `hide_command_messages` that **shows** overlay cooldown rows briefly (default) or **hides** them. `hide_command_messages` continues to hide **successful** command lines; default cooldown display still flashes frozen rows.
- Admin Live and OBS dock: accepted vs frozen highlight; **countdown only on these surfaces**. Reload while the process is alive restores status from the in-memory map. `show_leaderboard` fires also count as accepted.

## Capabilities

### New Capabilities

- None. Feedback attaches to existing command, overlay, admin, and config surfaces.

### Modified Capabilities

- `chat-commands`: Publish fired/cooldown outcomes; keep unknown/disabled/extra-word lines as ordinary chat; no platform replies.
- `websocket-feed`: Add `command_outcome` frames; older clients ignore the type.
- `obs-overlay`: Short frozen cooldown row; independent of hiding successful commands.
- `admin-and-dock`: Accepted/frozen chrome and countdown; Settings checkbox; restore after reload.
- `config-store`: Persist the overlay cooldown-visibility flag (default: show briefly).
- `http-api`: Recent-message reads include the in-memory outcome so admin/dock can restore after reload.

## Impact

Touches `internal/command` (cooldown remaining + process-local outcomes), `internal/api` ingest/hub/recent messages, `internal/config`, overlay chat JS/CSS, admin Live + Settings, dock messages, diagnostics logs/counters already present, EN/RU copy, and `[Unreleased]` changelog. No SQLite schema, no connector send path, no aliases/typos (packet 4).
