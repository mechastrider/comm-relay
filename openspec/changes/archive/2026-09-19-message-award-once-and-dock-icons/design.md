## Context

Operator awards currently allow unlimited grants against the same chat `message_id`. That was requested when awards first shipped and left as a product question. One-click Streamer Like made accidental repeats cheap. OBS dock rows still mix a Like icon with labeled Reward/Delete and a “Command accepted” chip that reads as a fourth button.

Sketch of the target dock row: `docs/mockups/dock-message-row-icons.html`.

## Goals / Non-Goals

**Goals**

- Stop a second grant of the same award type on the same source message across Live, dock, and reload.
- Keep stacking different types on one line (Joke then Advice).
- Make dock Reward/Delete icon-only like Streamer Like.
- Replace the accepted text chip with a checkmark; show a snowflake on frozen command rows with the existing short countdown or reject reason.

**Non-Goals**

- Session/day XP caps per viewer (OQ-005).
- One award of any type per message.
- Icon-only Reward/Delete on Live.
- Overlay operator controls.
- A SQLite UNIQUE index that would fail upgrades with historical duplicate grants.
- New HTTP routes.

## Component / Process / IPC Boundaries

Uniqueness lives in the existing `GrantAward` SQLite transaction (`internal/store`), using durable `interaction_events` of kind `award` keyed by `message_platform`, `message_id`, and `award_id`. `POST /api/awards/grant` maps the sentinel to HTTP 409. Viewer `like` that already reuses grant effects hits the same path when it stores a source message id.

`GET /api/messages/recent` attaches `granted_award_ids` by looking up those events for in-memory recent rows. Live `message` WebSocket frames do not need the array: the granting client updates local state; other clients learn on reload or on 409.

Dock-only icon chrome is a render option in shared `web/shared/reward-picker.js` (and delete button construction in `web/dock/messages.js`). Command-outcome check/snowflake is shared `web/shared/command-outcome-ui.js` for Live and dock.

No native IPC, tray, or extra process.

## State and Event Flow

```
grant request (platform, user_id, award_id, optional message_id)
        │
        ▼
GrantAward transaction
        │  message_id empty ──► grant as today
        │
        ▼
SELECT award event for (platform, message_id, award_id)
        │
   found ──► ErrAwardAlreadyGranted ──► HTTP 409, no XP/alert
        │
   miss ──► XP + event + alert as today
        │
        ▼
clients: dim that award control; success copy under the row
reload: GET recent → granted_award_ids restore
```

## Threading / Async / Cancellation

Store mutex already serializes grants. Two in-flight posts: one commits, one 409. Browser `grantInFlight` stays. Shutdown does not need new cancellation.

## Security and Trust Boundaries

Unchanged localhost process. 409 bodies stay UI-safe. Logs: award id and message id, not chat text.

## Decisions and Alternatives

1. **Same `award_id` per message, not any award**  
   Choice: uniqueness is `(platform, message_id, award_id)`.  
   Why: Joke then Advice is a real operator intent; accidental double Like is the failure.  
   Alt: one grant per message (too strict); client debounce only (fails across dock+Live).

2. **Application check, no UNIQUE index**  
   Choice: SELECT in the grant transaction; no Goose unique index.  
   Why: existing installs may already have duplicate events; a unique index would fail migrate. New duplicates are still prevented.  
   Alt: unique index plus a data rewrite (out of scope).

3. **409, not 400**  
   Choice: HTTP 409 like other CommRelay conflicts.  
   Why: the request is well-formed; the line is already in that state. Clients distinguish from retryable grant failure.

4. **Restore via recent GET, not a new route**  
   Choice: optional `granted_award_ids` on recent messages.  
   Why: dock/Live already reload from that snapshot; POST-action API stays unchanged.

5. **Dock icons only; command chrome on Live and dock**  
   Choice: medal/trash only on `/dock/messages`; check/snowflake shared.  
   Why: Live has width for labels; the accepted chip is awkward on both surfaces. Sketch is dock-sized.

6. **Snowflake keeps compact text**  
   Choice: icon plus `12 с` / `уточни`, not icon-only frozen status.  
   Why: remaining time and reject reason are operational during a stream.

## Risks / Trade-offs

- **[Risk] Historical duplicates** → New grants blocked; old extra events stay in history. No automatic cleanup.
- **[Risk] Grants without `message_id`** → Still unlimited; rare (identity-only grant).
- **[Trade-off] Second dock tab** → Like stays clickable until 409 or reload; acceptable.
- **[Trade-off] Medal at 16px** → Use a simple award glyph (circle + ribbon), not the dense overlay medal emblem.

## Migration / Rollout / Rollback

Replace the binary. No Goose version required. Rollback: previous binary allows duplicate grants again; extra JSON fields ignored; dock shows labeled buttons again.

## Open Questions

None. OQ-005 remains a separate session-XP question.
