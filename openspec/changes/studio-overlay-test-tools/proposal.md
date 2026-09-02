## Why

Streamers cannot currently exercise time-dependent overlay behavior without a live broadcast. Studio previews are static samples, so reward animations, alert queues, leaderboard updates, and the exact OBS Browser Source result are hard to verify. Repeated text buttons also add visual noise, while alert chrome is constrained to a narrow card instead of adapting to the source rectangle.

## Users and Supported Platforms

The change serves streamers and OBS operators using the web or Wails Studio. Windows with OBS Browser Source is the primary target; Linux and macOS browser/OBS behavior remain supported. It is connector-independent.

## What Changes

- Add one process-global, local-only Studio test channel that emits typed message, rewarded-message, command-alert, leaderboard-update, and alert-burst scenarios to dedicated test overlay routes.
- Serve test chat, leaderboard, and alert pages only at `/overlay/test/chat`, `/overlay/test/leaderboard`, and `/overlay/test/alert`; connect them only to `/ws/overlay-debug` so test content fails closed and never reaches production overlay routes or `/ws`.
- Provide stable active-preset test URLs plus optional current-preview snapshot URLs, receiver/delivery feedback, and global reset/replay controls without changing scores, history, analytics, active presets, published settings, or live overlay clients.
- Use familiar icons for contextual copy, refresh, replay, and preset-management actions, with localized accessible names, keyboard focus, and tooltips. Keep the preset actions visible beside the preset selector, distinguish deletion visually and retain its confirmation, and give shared text and icon buttons a raised physical treatment with a pressed state. Other ambiguous, primary, and destructive actions retain visible labels.
- Make every overlay root fill its Browser Source rectangle. Make the alert's primary chrome use the available rectangle rather than a narrow maximum width, while preserving content-sized chat messages and configured leaderboard layouts.

## Capabilities

### New Capabilities
- `overlay-debugging`: A globally shared, non-persistent Studio scenario channel and dedicated test-only overlay subscriptions.

### Modified Capabilities
- `admin-design-system`: Standard icon-action policy and accessibility contract.
- `admin-and-dock`: Studio test controls, URLs, and operator feedback.
- `http-api`: Typed local debug actions with bounded inputs.
- `websocket-feed`: A dedicated debug WebSocket audience and frames isolated from the production feed.
- `obs-overlay`: Full-rectangle chat surface and test-event rendering.
- `obs-leaderboard`: Full-rectangle leaderboard surface and test updates.
- `overlay-alerts`: Full-rectangle alert chrome and test queue scenarios.

## Scope / Non-Goals

No arbitrary JSON/script injection, persistent scenario state, score grants, chat recording, OBS scene control, new theme, icon-only conversion of workflow-specific actions outside the explicit preset toolbar, or redesign of tabs and navigation controls is included.

## Impact

This adds local POST-action endpoints, three dedicated test pages, a dedicated debug WebSocket route, process-memory orchestration, and Studio/overlay UI changes. Existing production routes, URLs, active presets, and event contracts remain unchanged. Older builds return 404 for the dedicated test HTTP and WebSocket paths instead of falling back to live content. No database, config migration, browser-storage key, OS permission, dependency, executable shape, or installer change is required.
