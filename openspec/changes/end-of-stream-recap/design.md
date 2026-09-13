## Context

CommRelay already owns persistent `stream_sessions` and `viewer_session_stats`, but its reads resolve only the open session. Interaction events and achievement unlocks have timestamps without session foreign keys. The existing alert page can fill only the Browser Source rectangle chosen for alerts; in the user's OBS composition that rectangle is a short top banner, so it cannot deliver the desired full-screen finale. The recap must therefore be a separate source, while session boundaries remain the explicit New stream action.

## Goals / Non-Goals

Goals:

- provide a deliberate full-canvas closing moment with final session ranking and achievements;
- make session attribution durable and conservative across upgrades and viewer merges;
- preserve an immutable public-safe snapshot that can be hidden and shown again;
- expose compact session history without retaining full chat;
- recover a visible recap after Browser Source reconnect without reviving it after process restart;
- support every current theme, active/pinned presets, desktop and headless deployments.

Non-goals:

- automatic stream start/end detection or any implicit session reset;
- a full Analytics workspace, charts, export, deletion, labels, or archived-chat storage;
- replaying arbitrary historical recaps to production;
- final-rank MVP grants, Credits, new achievement metrics, or changes to live alert/leaderboard scheduling;
- connector, OAuth, OS integration, installer, or updater changes.

## Component / Process / IPC Boundaries

- `internal/store` owns session attribution, historical queries, snapshot capture, uniqueness, privacy filtering inputs, and additive migration/backfill.
- A recap runtime controller owns only ephemeral hidden/visible state and the currently visible snapshot id. It starts hidden, serializes Show/Hide/New-stream transitions, and publishes after successful storage operations.
- `internal/api` exposes bounded reads and POST actions. It builds one shared public snapshot DTO for HTTP and WebSocket; clients never calculate authoritative recap content.
- The production hub carries `stream_recap_state`; debug clients remain isolated. Other clients ignore the new type.
- `web/recap` is a new embedded static surface with its own DOM, CSS, reconnect, sample preview, and all-theme mappings. It does not import or participate in the alert scheduler.
- `web/admin` owns Live confirmation/control, the bounded history dialog, Studio surface selection, and OBS URL guidance.
- SQLite retains session facts and recap snapshots. `config.json` retains only optional recap appearance inside existing presets.

## State and Event Flow

1. Every new live interaction event receives the current session id inside its existing transaction. A live achievement unlock receives the same session id; administrative/backfill unlocks receive none.
2. Live opens the recap dialog from `GET /api/stream-recaps/current` and displays the returned session id and current summary.
3. Confirm posts that id to Show. Under the store serialization boundary, the server verifies it is still open, reuses the unique stored snapshot or calculates public-safe totals, Top 5, current titles, and six newest grouped unlocks, then commits.
4. The runtime controller marks that snapshot visible and broadcasts the exact bounded DTO. `/overlay/recap` replaces its empty DOM with the full-canvas composition.
5. Hide clears runtime visibility and broadcasts a null snapshot. The durable snapshot remains. Repeated Show for the same current session reuses it, even when later activity changed normalized rows.
6. New stream retains its existing explicit semantics, additionally hides recap after the new session commits, and never creates a recap implicitly.
7. History reads normalized aggregates for any session and returns a stored snapshot when one exists. The next-session boundary remains distinct from recap capture time.

## Threading / Async / Cancellation

Existing store mutex/serialized transactions prevent Show racing StartSession or live fact writers into a mixed snapshot. Snapshot calculation and insert share one transaction. Runtime state changes only after commit and uses one lock; WebSocket broadcast stays outside the storage transaction. Concurrent Shows for one session converge on the unique snapshot. Concurrent Hide is idempotent. HTTP cancellation before commit rolls back; cancellation or a slow/dropped client after commit cannot undo the snapshot. The overlay uses one reconnect timer with the established bounded exponential backoff and does not poll history.

## Security and Trust Boundaries

All routes stay on the existing localhost boundary. Identifiers, limits, cursors, and snapshot JSON are validated and bounded. HTML-like names and descriptions render through text nodes. Snapshot rankings honor `leaderboard_hidden`; achievement recognition honors the definition's current `announce` choice and the viewer's progression exclusion. The explicit recap is independent from global live progression-alert toggles. APIs and logs omit raw chat, source-message identifiers, filesystem paths, secret locked definitions, and connector credentials. Remote portraits follow existing HTTP(S) rules; stored assets use generated safe names.

## Decisions and Alternatives

### Decision: Use a dedicated `/overlay/recap` surface

The recap fills its own OBS rectangle and implements all current themes. Reusing `/overlay/alert` was rejected because alert sources may intentionally occupy only a banner-sized region and because recap visibility/reconnect semantics differ from a timed local queue.

### Decision: Recap never changes the session boundary

Show and Hide are presentation actions only. Coupling Show to StartSession was rejected because post-stream chat would contaminate the next stream and because a true inactive-stream state belongs to separate stream-lifecycle research.

### Decision: Persist one immutable snapshot per session

The first confirmed Show defines the recap cutoff; later Show reuses exactly that version. Recomputing on every display was rejected because on-air output and history could drift. Snapshot storage uses a versioned, bounded JSON payload beside indexed scalar identity/timestamps: this preserves the exact wire presentation while normalized session rows remain the historical source for sessions without recaps.

### Decision: Make durable facts session-aware

Nullable session foreign keys are added to interaction events and achievement unlocks. Stats already carry a session id. Attaching only unlocks was rejected because session history could not explain awards/activity or support later aggregate work consistently.

### Decision: Backfill only unambiguous live history

Existing event timestamps may be mapped to exactly one `[started_at, ended_at)` interval, with the current open interval extending forward. Existing non-backfilled unlocks use the same rule. Ambiguous records and every backfilled unlock remain null. Guessing would turn an approximate timestamp into false authoritative history.

### Decision: Keep history compact and operational

Live owns a scrollable Current/History dialog with paginated summaries and details. A new Analytics workspace and historical on-air replay were rejected for this change so OQ-003 and future analysis design remain independent.

### Decision: Use a bounded, deterministic public composition

Top 5 follows existing session leaderboard ordering. Achievement occurrences group by viewer, achievement, and revision; the six groups with newest unlocks win. Empty areas collapse. This bounds WebSocket frames and keeps every theme testable. Final-rank MVP remains deferred because recap capture should first establish the authoritative final-ranking fact without recursively changing its own snapshot.

### Decision: Persist snapshots, not visibility

Browser Source reconnect receives current in-process visibility, while a process restart starts hidden. Persisting visibility was rejected because restarting CommRelay must not unexpectedly cover the stream with an old finale.

## Risks / Trade-offs

- An accidentally confirmed early snapshot cannot be refreshed in this version; the confirmation copy must clearly describe permanence.
- A dedicated source adds one OBS setup step, but it makes full-canvas placement predictable and leaves alert geometry untouched.
- Historical attribution remains incomplete for ambiguous legacy rows by design; history exposes available data without fabricating completeness.
- A versioned JSON snapshot duplicates a small amount of aggregate data, trading normalization for exact replay and simple schema evolution.
- Remote snapshotted portrait URLs may later fail; local cache URLs and deterministic fallbacks preserve layout.
- Session history grows with aggregate rows, events, unlocks, and one small snapshot per session; no full chat or unbounded response is added.

## Migration / Rollout / Rollback

Add the next immutable Goose migration after `00018`: nullable indexed `session_id` foreign keys on interaction events and achievement unlocks plus a `stream_recaps` table with unique `session_id`, schema version, captured time, bounded payload, and created time. Backfill interaction events and non-backfilled unlocks only through unambiguous session intervals before adding indexes; preserve nulls. Provide a down migration that drops the new table/indexes/columns without touching existing session stats.

Older config files omit `surfaces.recap` and resolve theme defaults without rewrite. Older binaries ignore the optional config object and additive SQLite data, but a rollback cannot display recaps; later forward upgrade reuses the preserved migration state when the down migration was not applied. Release packages gain only embedded static assets and documentation. Roll out disabled/hidden until the operator adds the new OBS source and explicitly shows a recap.

## Open Questions

None block implementation. Optional session labels, historical on-air replay, snapshot replacement, full Analytics, and MVP granting remain future product decisions.
