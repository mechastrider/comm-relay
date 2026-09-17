## Why

Audience → Viewers already shows period XP and messages, but not how many streams a person actually wrote in. Operators already rely on that participation count for Veteran (`session_count`); the directory still hides it.

## What Changes

- `GET /api/viewers` and `GET /api/viewers/get` include integer `session_count`: distinct `viewer_session_stats` rows with `message_count > 0` for that canonical viewer (same predicate as Veteran).
- Audience directory adds a sortable **Streams** / **Эфиры** column that does not follow the session/day/all period filter.
- The viewer card adds one lifetime streams row next to existing session/day/all-time XP and message stats.
- Sort uses the same three-click cycle as XP/Messages and persists in browser/WebView storage. Invalid stored values still fall back to last-activity order.

No **BREAKING** change: `session_count` is additive. `session_message_count` remains current-session messages.

## Capabilities

### New Capabilities

- None. This exposes an existing participation metric on the directory.

### Modified Capabilities

- `viewer-stats`: List and get include lifetime participating-stream count; merge keeps Veteran-equivalent counting.
- `http-api`: Viewer list/get JSON includes `session_count`.
- `admin-and-dock`: Audience column, sort, and card row for that count.

## Impact

Touches store list/get queries, viewer JSON mapping, Audience table/card JS, EN/RU copy, and `[Unreleased]` changelog. Reuse the Veteran SQL predicate; do not add `viewers.session_count`. Overlay, recap, leaderboard, and progression catalog UI stay unchanged.
