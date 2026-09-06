## Why

The leaderboard is currently either continuously rendered or hidden manually in OBS. That forces the streamer to manage scene visibility during a broadcast and provides no coordinated way to show the ranking after meaningful XP changes, an award, a viewer request, or a dock action. Treating each cause as a separate mode would create conflicting behavior; the product needs one visibility state machine with independent triggers.

## Users and Supported Platforms

Streamers operating CommRelay through the local admin, Wails shell, or `/dock/messages`, plus viewers whose Twitch, YouTube, or VK chat command may request the ranking. OBS Browser Sources remain platform-neutral.

## What Changes

- Add global leaderboard policies: `always`, `automatic`, and `on_request`.
- Add a server-authoritative runtime state: hidden, timed, or pinned, synchronized to all production leaderboard clients.
- In automatic mode, show for 15 seconds after configured award or meaningful rank-change triggers; use a five-minute cooldown and a dirty-only 15-minute fallback interval.
- Add POST-action controls to show, hide, pin, and resume policy behavior; keep `resume` as the internal/API action that clears an override.
- Add a compact unthemed toolbar above the OBS message dock with visibility status, countdown, policy-specific controls, and active-preset selection: one visibility switch in `always`, and timed Show, Pin toggle, and Hide in `automatic` or `on_request`.
- Extend operator-defined commands with an action kind so a configurable command can show the leaderboard without also creating a splash alert.

## Capabilities

### New Capabilities

- `leaderboard-visibility`: Policy, trigger, cooldown, timer, override, and recovery behavior.

### Modified Capabilities

- `config-store`: Persist validated global leaderboard visibility settings.
- `websocket-feed`: Broadcast visibility snapshots and transitions separately from ranking data.
- `http-api`: Expose localhost read state and POST-action controls.
- `admin-and-dock`: Configure the policy and operate it from the dock.
- `chat-commands`: Support `alert` and `show_leaderboard` command actions.
- `interaction-events`: Preserve command-event logging for non-alert command actions.

## Scope / Non-Goals

No OBS WebSocket integration, scene switching, remote control, new built-in command seed, XP/ranking changes, or per-preset visibility policy. Coordinating a backlog of multiple alert splashes with the delayed award trigger is not included; the delay covers the triggering award's own duration.

## Impact

Adds localhost API and WebSocket fields, a cancellable in-process controller, config fields, and an additive SQLite command-action migration. Existing commands migrate to `alert`; clients ignoring the new frame remain compatible. The feature is local-only and adds no permissions or secrets. Release notes and operator documentation are required; packaging format is unchanged.
