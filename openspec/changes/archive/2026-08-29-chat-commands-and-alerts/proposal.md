## Why

Chat still has no on-stream interactivity: commands do nothing, and the only message action is delete. Streamers need a splash (avatar, text, sound) from a chat command or a dock/admin reward. Score bonuses come from the operator, not from farming `!gg`. An event log in this slice keeps later achievements retrospective.

## Users and Supported Platforms

Operators on Windows, Linux, and macOS (desktop and headless). Viewers on Twitch, YouTube Live, and VK Live. OBS Browser Source `/overlay/alert`; Custom Browser Dock for rewards. No cloud accounts.

## What Changes

- Two SQLite catalogs: chat commands and award types. Deletable seeds `!gg` / `!hi` and Joke (+10) / Advice (+50).
- Server matches a whole trimmed, lowercased line starting with `!` (exact trigger; no parameters). Per-viewer cooldown is per-command and configurable. Commands never change `score`.
- Global `hide_command_messages` (default off): overlay may hide command lines; admin and dock still show them. `message_count` still increments.
- `/overlay/alert`: FIFO queue, no preemption; viewer avatar, `{name}` / `{points}` text, built-in tones or silence. Nullable media fields reserved; no upload here.
- Admin and dock: Reward → award picker. Same message may be rewarded more than once (revisit later).
- Append-only log of command fires and awards. Studio enables the Alerts URL. Alert page follows the scene theme.

## Capabilities

### New Capabilities

- `chat-commands`: catalog CRUD, `!` matching, cooldown, seeds, hide-from-overlay
- `operator-rewards`: award catalog, grant from a chat line, score delta, seeds
- `overlay-alerts`: `/overlay/alert`, queued splash, WebSocket `alert` frames, themed surface
- `interaction-events`: append-only log of command fires and awards

### Modified Capabilities

- `config-store`: persist `hide_command_messages`
- `http-api`: POST-action command/award APIs; GET lists
- `websocket-feed`: `alert` frames
- `admin-and-dock`: Audience catalogs; Reward on messages; dock picker; Studio alerts URL
- `obs-overlay`: alert surface implements every theme
- `viewer-stats`: operator awards add `score`; commands do not

## Scope / Non-Goals

In: mechanism, two catalogs, queue, dock reward, event log, seeds.  
Out: command parameters, image/mp3 upload, achievements UI, scoring-rule editor, duplicate-award lock, TTS, ranks.

## Impact

Goose tables in `comm-relay.db`; one config key; admin Audience + dock JS; `web/alert/`; CHANGELOG and README. Sounds play in the alert Browser Source for OBS capture. Local-only; no extra OS permissions.
