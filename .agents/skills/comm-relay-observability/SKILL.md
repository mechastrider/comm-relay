---
name: comm-relay-observability
description: CommRelay-specific logging and diagnostics counters for chat ingest, commands, awards, bus/WebSocket delivery, and stream incident debugging. Use when adding connectors, bus consumers, commands, overlay delivery, or diagnosing missing messages/alerts.
---

# CommRelay observability

Extends [golang-logging](../golang-logging/SKILL.md) with **product event** rules for CommRelay. Generic `clog` API and error wrapping stay in `golang-logging`; this skill defines **what** to log and **where** counters belong.

## When to use

- Adding or changing connectors, `internal/bus` consumers, command matching, award grants, leaderboard visibility, or WebSocket broadcast paths.
- Debugging stream incidents: message in Twitch but not in CommRelay; alert without Live line; command cooldown / empty identity skips.
- Extending `GET /api/diagnostics` pipeline counters.

## Core rules

1. **Silent skips are bugs in observability** — any early `return` on ingest or delivery that affects product behavior MUST log (`Warn` or `Debug`) and/or increment a counter in [`internal/observability`](../../../internal/observability/registry.go).
2. **Drops are always `Warn` + counter** — bus subscriber buffer full and WebSocket client queue full use rate-limited `clog.Warn` via `observability.Default.RecordBusDrop` / `RecordWebSocketDrop`.
3. **No chat bodies at `Info`** — log `platform`, `message_id`, `user_id`, `trigger`, `award_id`, `action`; never OAuth tokens or full message text at `Info`.
4. **Per-message receipt is `Debug` only** — connectors log `chat message published` at `Debug` after successful `bus.Publish` (visible with `-debug`).
5. **Prefer diagnostics counters for post-mortem** — session logs rotate (default retain 5); `pipeline` in `/api/diagnostics` survives in the admin UI during the process lifetime.

## Event catalog

| Event | Level | Fields | Counter |
|-------|-------|--------|---------|
| Bus event dropped | Warn (rate-limited) | `subscriber`, `event_type`, `total_drops` | `pipeline.bus_drops[subscriber]` |
| WebSocket frame dropped | Warn (rate-limited) | `frame_type`, `total_drops` | `pipeline.websocket_drops[type]` |
| WebSocket write failed | Warn | `frame_type`, `error` | — |
| Command fired | Info | `trigger`, `platform`, `user_id`, `message_id`, `action` | `commands_fired` |
| Command suppressed (cooldown) | Debug | `trigger`, `platform`, `user_id` | `commands_suppressed.cooldown` |
| Command skipped (empty identity) | Warn | `trigger`, `platform`, `message_id` | `commands_suppressed.empty_identity` |
| Award granted | Info | `award_id`, `platform`, `user_id`, `points` | `awards_granted` |
| Leaderboard visibility changed | Info | `state`, `reason`, `policy`, `visible` | — |
| Chat message published (connector) | Debug | `platform`, `message_id`, `user_id` | — (use existing `message_counts`) |
| YouTube skip (empty/dedupe) | Debug | `reason`, `message_id` | — |
| Handler/DB errors | Error (`clog.Errorf`) | existing patterns | — |

## Bus subscribers (named)

Register with `bus.Subscribe(name)`:

| Name | Consumer |
|------|----------|
| `websocket-hub` | `Hub.Run` — chat + leaderboard visibility to WebSocket |
| `message-history` | `MessageHistory.Run` — recent messages API |
| `viewer-ingest` | `ViewerIngest.Run` — viewers, commands, alerts |
| `message-counter` | `status.RunMessageCounter` — diagnostics totals |

Asymmetric drops between subscribers explain alert-without-message bugs.

## Implementation checklist (new feature)

- [ ] Success path logs at the correct level (Info for product events, Debug for per-message).
- [ ] Every intentional skip on ingest/delivery logs and/or calls `observability.Default.RecordCommandSuppressed` or drop helpers.
- [ ] Bus consumer registered with a stable name.
- [ ] If adding a new drop surface, extend `observability.Snapshot` and `/api/diagnostics` `pipeline` field.
- [ ] Tests for counter increments where behavior is critical (`bus` drops, command fire).
- [ ] No secrets, tokens, or full chat lines at `Info`.

## Related

- Generic logging API: [golang-logging](../golang-logging/SKILL.md)
- Backend layout: [comm-relay-backend-golang](../comm-relay-backend-golang/SKILL.md)
- Product logging brief: [`docs/concept.md`](../../../docs/concept.md) §Логирование
- Session log path: `<config-dir>/logs/session-*.log` (see `internal/logging`)
