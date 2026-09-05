## Context

Viewer ingest currently adds `points_per_message` to SQLite `score` on every identified chat line, then publishes leaderboard snapshots. Manual awards add the same `score` and enqueue alerts. Interactive System v1 described three wallets (Session Score, Persistent XP, Credits). Operators chose a smaller foundation: keep the existing session/day/all windows, call the number XP, stop paying for every line, and expand award seeds. Credits, levels, and command media stay later work.

The mutation points already exist in `internal/api` ingest, `internal/store` chat/award/merge, `config.json` public fields, and admin/overlay JSON that today says `score`.

## Goals / Non-Goals

Goals:

- One contribution currency named XP, with the same three time windows operators already use.
- Silent, flood-safe activity XP instead of unbounded per-message points.
- Additive contribution award seeds with stable ids for later achievements.
- Public JSON and UI that say `xp` / XP, without a long-lived `score` alias.

Non-goals:

- Credits, levels, achievements UI, Reward Library, command images/sounds/templates, community awards, rules engine, saved chat, or changing alert layout.
- Rebalancing existing Joke/Advice values or rewriting operator-edited award rows.
- Per-message XP as an optional parallel mode.

## Component / Process / IPC Boundaries

- Connectors are unchanged. They still emit unified chat lines; they do not know about XP.
- `internal/api` ingest remains the only place that turns an identified line into counters. It reads activity settings from the config store, asks SQLite to increment `message_count`, and conditionally grants activity XP in the same viewer transaction.
- `POST /api/awards/grant` still adds award `points` to XP and broadcasts an `alert`. Activity never uses that route.
- `config.json` owns activity settings. SQLite owns balances and per-session activity counters. No new process, IPC, or native OS API.
- Admin, dock, Live Leaderboard, Statistics, and `/overlay/leaderboard` consume `xp` on HTTP and WebSocket payloads. Overlay alert frames keep `points` as the event delta.

## State and Event Flow

```text
identified chat line
  -> +1 message_count (session/day/all)
  -> if activity eligible:
       +activity_xp (session/day/all)
       persist session grant count + last_activity_at
       append interaction kind=activity
       no alert
  -> publish leaderboard snapshots (message_count and/or xp)

operator Reward
  -> +award.points to xp (session/day/all)
  -> interaction kind=award
  -> alert + leaderboard snapshots

!command
  -> counted as a chat line (message_count, maybe activity)
  -> command fire does not add XP
  -> existing command alert
```

Activity eligibility (all must hold): settings `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` are each > 0; this session's grant count for the viewer is below the limit; no prior grant this session, or `now - last_activity_at >= interval`. The first counted line of a session may grant immediately.

New stream opens a new session row, so session XP, message counts, and activity counters start at 0. Day and all-time XP stay.

## Threading / Async / Cancellation

Ingest and grant remain synchronous HTTP/bus work plus existing leaderboard publish coalescing. Activity state lives in SQLite, not an in-memory map, so a restart cannot reset the session cap. No new background runnable. Overlay clients ignore missing `alert` frames for activity by design.

## Security and Trust Boundaries

Unchanged localhost operator trust model. Activity settings are non-secret integers on the public config. Interaction events for activity store no chat text. Award grant identity rules are unchanged.

## Decisions and Alternatives

1. **One XP currency, three windows — not Score + XP + Credits.** Session ranking is "XP this stream"; career is "XP all-time"; day stays the existing calendar window. A second contribution wallet would need asymmetric grant fields with no current operator scenario. Credits wait until there is something to buy.
2. **Rename public JSON to `xp` with no `score` alias.** CommRelay owns the only clients. Dual fields would linger in every handler and fixture. Cached old admin pages against a new server are not a supported mixed install.
3. **Keep award `points` as the grant delta.** Overlay alerts, templates `{points}`, and the Reward picker already use that word for the event, not the balance.
4. **Silent activity, not an `active` award type.** Putting Active in the picker invites manual grants and overlay spam. Settings plus an `activity` journal event are enough for later achievements.
5. **Persist activity on `viewer_session_stats`.** Counting journal rows on every message is extra work and depends on merge rewriting events. Session stats already reset on New stream.
6. **Additive seeds by id, leave Joke/Advice alone.** Existing operators keep their customized Advice. New ids are inserted only when absent; Goose runs once, so a later delete stays deleted.
7. **Ignore leftover `points_per_message`.** Do not keep a hidden per-message XP switch. Omitting it on save means an old binary may default back to 1; that is accepted rollback behavior, not a compatibility feature.

## Risks / Trade-offs

- Operators who liked +1 per line will see slower all-time growth unless they grant awards. That is the product intent; activity defaults (300s, 10/session, +1) keep a small presence signal.
- JSON rename breaks any external script reading `score`. None ships with the product.
- SQLite `RENAME COLUMN` is a one-way Goose step; rollback is the previous binary plus a restored DB copy, not a down-migration in the upgrade path.
- Merging two viewers in the same session should sum XP and activity grant counts and keep the later `last_activity_at`, or a merged identity could receive extra activity. Implementation must cover that in store tests.

## Migration / Rollout / Rollback

- Goose: rename `score` to `xp` on `viewers`, `viewer_session_stats`, and `viewer_day_stats`; add `activity_grants` (integer, default 0) and `last_activity_at` (nullable text) on `viewer_session_stats`; insert missing award seed rows.
- Config load fills omitted activity fields with 300 / 10 / 1 and stops applying `points_per_message`.
- Implementation updates `docs/concept.md`, `docs/roadmap.md` phase 6c language, and a concise Russian `[Unreleased]` changelog. `docs/interactive-system-v1.md` stays a concept note; implementation should not pretend Credits already shipped.
- Rollback: previous binary; old code expects `score` columns, so operators who upgraded need a pre-upgrade DB copy if they downgrade. Document that in release notes.

## Open Questions

None. Product choices (XP-only, activity instead of per-message points, no Credits, command media later) were locked before this change.
