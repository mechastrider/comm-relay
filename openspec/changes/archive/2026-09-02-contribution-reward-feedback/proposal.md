## Why

Operator rewards already change score and open an OBS alert, but the on-stream feedback is detached from the message that earned the reward. The chat overlay cannot highlight that message, the alert cannot explain why points were granted, the admin leaderboard stays stale until refresh, and command bursts can delay a manual reward behind old entertainment alerts. This weakens the first, manual-recognition step of Interactive System v1.

## Users and Supported Platforms

The change serves stream operators and viewers on Twitch, YouTube Live, and VK Live. It uses the existing unified message identity and behaves best-effort when a connector has no stable message id. It applies equally to the headless server, Wails desktop UI, OBS dock, and Browser Sources.

## What Changes

- Carry a bounded transient source-message snapshot through award grant and WebSocket alert delivery without persisting chat text.
- Highlight a rewarded chat card when it is still visible and render award alerts with award identity, points, author, and a short quote.
- Replace alert FIFO with one non-preempting visible alert plus separate award and command waiting lanes; awards run first and stale commands expire.
- Apply existing leaderboard WebSocket snapshots to the active Live Leaderboard and refresh active Statistics with debounce.
- Store independent panel-opacity overrides for Chat, Leaderboard, and Alerts inside each overlay preset. Omitted values use the shared legacy value, except that untouched cockpit presets retain their historical theme glass until a surface receives an explicit override.
- Add only workflow-adjacent UI feedback: successful grant state, clear selected states in Commands and Awards, and alignment of New stream with the Live toolbar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `operator-rewards`: message-aware grants and transient reward context.
- `interaction-events`: explicit prohibition on persisted quote text.
- `websocket-feed`: backward-compatible reward context in alert frames.
- `overlay-alerts`: distinct award presentation and priority scheduling.
- `obs-overlay`: rewarded-message highlight and per-surface opacity.
- `obs-leaderboard`: independent panel opacity.
- `admin-and-dock`: grant feedback, catalog selection, and live ranking refresh.
- `config-store`: per-preset, per-surface opacity overrides.

## Scope / Non-Goals

No Score/XP/Credits migration, activity policy, achievements, saved messages, custom media, template-language expansion, streamer-name setting or preset override, alert layout modes, Reward Library, redemptions, rules engine, or community awards. General Audience table and navigation cleanup are separate work.

## Impact

The localhost award action and WebSocket envelope gain optional fields. `config.json` receives additive preset fields with fallback defaults and no eager rewrite; runtime compatibility preserves historical cockpit glass where shared zero was previously ignored by theme CSS. SQLite schema, platform connectors, OS integration, packaging, and secrets are unchanged. Message text exists only in bounded in-memory/request/event payloads and is never added to logs or durable interaction history.
