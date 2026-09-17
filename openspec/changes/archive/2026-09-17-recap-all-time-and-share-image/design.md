## Context

INT-031 already ships an immutable per-session recap snapshot, a dedicated transparent `/overlay/recap` source, and Live Recap controls. Operators now want a second presentation on that same source — **all-time status** — plus a PNG they can post after the stream. Session capture, New stream, and SQLite `stream_recaps` stay as they are. Season totals remain INT-032.

All-time ranking and portraits already exist on `GET /api/leaderboard?period=all`. Unique viewers with messages already exist on canonical `viewers`. Recap overlay rendering already consumes snapshot-shaped totals and ranking. Nothing in the product captures the OBS Browser Source, and `html`/`body` on `/overlay/recap` are transparent by spec.

## Goals / Non-Goals

Goals:

- present session recap and all-time status as two windows of one recap surface;
- keep session capture immutable and never persist all-time as a recap row;
- let the operator switch windows while the source is visible without New stream;
- download an opaque 16:9 PNG of the selected window from the Recap dialog.

Non-goals:

- season/month/campaign windows;
- writing live all-time into the stored session snapshot;
- screenshotting the transparent OBS source;
- square export, required clipboard copy, historical on-air replay;
- new SQLite tables, config keys, installer, or Wails save-dialog bindings.

## Component / Process / IPC Boundaries

- `internal/store` computes all-time totals and Top 5 from existing viewer/leaderboard queries. It does not add a table.
- `internal/recap.Controller` owns ephemeral visibility plus the active window and, when `all`, the last all-time presentation. Session snapshots remain the stored `recap.Snapshot`.
- `internal/api` adds `POST /api/stream-recaps/show-all` and extends current/show/hide JSON. Overlay and admin never invent all-time aggregates.
- Production `/ws` continues to carry `stream_recap_state`. `window` and `all_time` are additive. Debug clients stay isolated.
- `web/recap` chooses session vs all-time copy and layout from the frame. It does not download files.
- `web/admin` Recap dialog owns the window switch, existing session confirmation, and PNG encode/download.
- PNG encoding stays in the admin page (Canvas from an opaque share-card built from presentation data). No native file picker.

## State and Event Flow

1. `GET /api/stream-recaps/current` returns stored `snapshot` (if any), live `all_time`, and runtime `visible`/`window`.
2. Session Show still confirms, captures or reuses `stream_recaps`, sets `window=session`, broadcasts `snapshot`, `all_time` null.
3. All-time Show posts `{}` to `show-all`, computes presentation, sets `window=all`, broadcasts `all_time`, `snapshot` null on the wire. SQLite recap rows are untouched.
4. Overlay renders from `snapshot` or `all_time` according to `window`. Hide and New stream clear runtime state and broadcast hidden.
5. Download uses the dialog's selected window: stored snapshot for session, current `all_time` for all-time. Overlay visibility is unchanged.

```
                 ┌────────────┐
   Show session  │ stream_    │  immutable
   ─────────────►│ recaps row │──────────► window=session + snapshot
                 └────────────┘
   Show all-time     compute now          window=all + all_time
   ─────────────► (no INSERT)  ──────────► overlay
   Download       opaque 16:9 PNG from selected presentation
```

## Threading / Async / Cancellation

Reuse the recap controller's serialized transitions. All-time compute runs under the same ShowAfter-style lock so it cannot interleave with session capture or New stream. WebSocket publish stays after the lock as today. HTTP cancellation before compute/publish leaves state unchanged. PNG encode is client-local and cannot roll back server visibility.

## Security and Trust Boundaries

Localhost only. All-time DTO is public-safe: display names, optional portrait URLs under existing rules, counts, ranks, titles. No chat text. Admin-built share-card inserts authored text as text nodes. PNG never leaves the operator machine except by their download. Overlay remains an untrusted renderer.

## Decisions and Alternatives

### Decision: Separate `show-all` action instead of overloading `show`

`POST /api/stream-recaps/show` stays the capturing session action with `session_id`. A second POST-action avoids a default that would capture when the operator only wanted all-time.

Rejected: `show` with `{ "window": "all" }` because a missing/wrong field could capture.

### Decision: All-time is frozen until the next show-all

Reconnect restores the last presented `all_time` payload, matching session reconnect. Reshowing all-time recomputes. Rejected: pushing every XP change on the recap source (that is live all-time embedded in the closing surface).

### Decision: Wire `snapshot` is null while all-time is visible

Admin still reads stored `snapshot` from GET current. Overlay must key off `window`. Putting all-time numbers into `snapshot` would mislabel them as a session recap.

### Decision: Encode PNG in the Recap dialog from data

Build an off-screen opaque 16:9 share-card from the same presentation fields the overlay uses, then Canvas-encode PNG and trigger `<a download>`. Rejected: html2canvas of `/overlay/recap` (transparent OBS). Rejected: server-side PNG (new dependency, extra trust surface). Square export is deferred unless the 16:9 path makes it free.

### Decision: Unique viewers use `message_count > 0`

Matches the research packet and Audience "streams" participation idea. Session recap totals keep their existing participation rule (`xp > 0 OR message_count > 0`). Leaderboard-hidden viewers stay out of ranking and remain in unique/totals when they have messages.

### Decision: No SQLite or config change

All-time is derived. Share images are not stored. Recap appearance already has backdrop opacity.

## Risks / Trade-offs

- Frozen all-time can drift from live Audience until the operator shows all-time again; copy should call it status, not a stored recap.
- Session download is unavailable before first capture; all-time download is always computable.
- Canvas/portrait loading can fail; errors stay in the dialog.
- Same-binary overlay/admin must ship together; mixed old overlay with new `window=all` would look hidden if it only inspected `snapshot`.

## Migration / Rollout / Rollback

No migration. Rollback is revert the binary; extra JSON fields are ignored by older clients; older binaries cannot show all-time or download. CHANGELOG `[Unreleased]` records streamer-visible behavior. No installer or signing step.

## Open Questions

None block implementation. Optional clipboard copy of the PNG, square export, and season window stay out of this change.
