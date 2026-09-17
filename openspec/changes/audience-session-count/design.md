# Design

## Context

See `proposal.md` for motivation. Veteran already counts participating streams with:

```sql
SELECT COUNT(*) FROM viewer_session_stats WHERE viewer_id = ? AND message_count > 0
```

`GET /api/viewers` and `GET /api/viewers/get` join the open session and current day for period XP/messages only. `store.Viewer` has no lifetime stream field. Audience sorts XP/Messages through `viewerPeriodMetrics`; the card shows three period `statLine` rows.

`session_message_count` is messages in the **current** open session. This change adds a different integer: `session_count`.

## Goals / Non-Goals

**Goals:**

- One participation predicate shared by Veteran and directory reads.
- List/get return `session_count` without N+1 queries on the directory.
- Audience column + card + sort without changing period XP/message behavior.

**Non-Goals:**

- Denormalized `viewers.session_count` column or Goose migration.
- Counting XP-only sessions.
- Overlay, recap, leaderboard, or progression catalog UI.
- Changing merge row consolidation (already sums per `session_id`).

## Decisions

### 1. Compute on read; do not denormalize

**Choice:** Derive `session_count` from `viewer_session_stats` at list/get time.  
**Why:** Packet forbids a stored column; Veteran already recounts live. Merge already consolidates session rows, so recount stays correct.  
**Alt:** Persist `viewers.session_count` and bump on ingest/New stream/merge. Rejected: extra write path and drift risk for a small directory.

### 2. Shared participation SQL fragment

**Choice:** Export one SQL fragment (or helper) used by `progressionMetricQuery` for `session_count` and by list/get. List uses a `LEFT JOIN` on a grouped subquery:

```sql
LEFT JOIN (
  SELECT viewer_id, COUNT(*) AS session_count
  FROM viewer_session_stats
  WHERE message_count > 0
  GROUP BY viewer_id
) vsc ON vsc.viewer_id = v.id
```

Get uses the same `COUNT(*)` as Veteran (or the same join). Missing rows become `0`.  
**Why:** Directory can be hundreds of rows; a grouped join is one extra scan. A per-row correlated count would work but is the N+1 we should avoid.  
**Alt:** Call `ProgressionMetricValue` per list row. Rejected: extra round-trips under the store mutex.

### 3. JSON field `session_count`, UI sort key `streams`

**Choice:** API/store field `session_count`. Audience sort column id `streams` (localStorage), mapped from `session_count`. English label **Streams**, Russian **Эфиры**.  
**Why:** `session_count` matches Veteran and the research packet. `streams` keeps sort prefs distinct from the session period. Invalid stored columns already fall back to last-activity order.  
**Alt:** Sort id `session_count`. Workable, but easier to confuse with `session_message_count`.

### 4. Card gets a fourth summary row

**Choice:** After the three period XP/message lines, add `viewers.statStreams` with the integer only (not `statLine`).  
**Why:** Period lines stay comparable; streams is lifetime, not a fourth period. Compact sheet and wide inspector share this renderer.  
**Alt:** Overload `statLine` with a dummy XP. Rejected: misleading.

### 5. Period hint copy

**Choice:** Update `audience.periodHint` so operators know XP/messages follow the period and Streams does not.  
**Why:** Spec requires the independence to be visible; today's hint only mentions XP and messages.

## Risks / Trade-offs

- [List cost] Grouped `COUNT` over `viewer_session_stats` on every directory refresh → Mitigation: table is already keyed `(viewer_id, session_id)`; no new index unless tests show a scan issue.
- [Name collision] Operators confuse `session_count` with current-session messages → Mitigation: UI says Streams/Эфиры; keep `session_message_count` unchanged.
- [Open session] Current session with messages counts as 1, matching Veteran → Mitigation: same SQL; tests include an open session.

## Migration Plan

No SQLite or config migration. Older admin JS ignoring `session_count` keeps working. Rollback is revert; leftover `streams` sort prefs become invalid and fall back to last-activity order.

## Open Questions

None.
