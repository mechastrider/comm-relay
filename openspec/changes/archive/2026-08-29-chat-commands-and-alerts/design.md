## Context

Phase 6a persists viewers and score in `comm-relay.db`. Chat ingest still adds `points_per_message` (unchanged here). There is no command parser, no `/overlay/alert`, and message rows only offer delete. Studio already shows a disabled Alerts placeholder. This change is roadmap 6b plus operator awards and an event log in the same slice.

## Goals / Non-Goals

**Goals:**

- Operator-owned command and award catalogs (two lists) with deletable seeds.
- Server-side `!` matching, per-viewer cooldown, overlay hide flag.
- Queued themed splash on `/overlay/alert` (avatar, text, built-in tone).
- Reward from admin Live and OBS dock; awards are the only new score source.
- Append-only interaction events for later achievements.

**Non-Goals:**

- Command parameters (`!gg 5`), keyword-in-prose matching.
- Custom image/mp3 upload (nullable columns only).
- Achievements UI, scoring-rule editor, TTS, ranks.
- Forbidding duplicate grants on the same message (allowed now).
- Changing `points_per_message` defaults.

## Component / Process / IPC Boundaries

```text
connectors → bus ChatMessageReceived
                 ├─ message-history (unchanged)
                 ├─ viewer ingest (message_count / points_per_message)
                 └─ command matcher → cooldown → alert hub + event log

admin/dock POST /api/awards/grant
                 └─ store score += points → alert hub + event log

/ws type=alert → /overlay/alert (queue in the page)
                 other clients ignore
```

Catalogs and events live in SQLite via the existing store mutex (same writer as ingest/merge). `hide_command_messages` stays in `config.json`. No extra OS process or IPC; desktop and server share the HTTP app.

## State and Event Flow

1. Ingest a line. If it matches an enabled command and cooldown allows: tag the chat `message` with `is_command: true`, enqueue `alert`, insert `interaction_events` kind `command`, do not touch `score`.
2. Overlay chat hides the line only when `hide_command_messages` is true.
3. Grant: resolve `(platform, user_id)` to a viewer (create if needed, same as ingest), add points to the three score periods, coalesced leaderboard snapshot, `alert`, event kind `award`.
4. Alert page: in-memory FIFO in JS; one visible splash; no HTTP replay.

## Threading / Async / Cancellation

Matcher and grant run on the store mutex / ingest runnable, not in connector goroutines. Cooldown map: in-memory `(viewer_id, command_id) → until` is enough for MVP (lost on restart; acceptable). Process shutdown cancels the runnable; pending overlay queue is not persisted.

## Security and Trust Boundaries

Localhost-only, same as today. Commands cannot execute OS actions. Templates are substituted on the server; overlay uses text nodes. Avatar URLs remain http(s) only. Reserved media fields are unused. No new secrets.

## Decisions and Alternatives

### 1. Two catalogs, one alert pipeline

**Choice:** `commands` and `award_types` tables; both produce the same `alert` wire type.  
**Why:** Operator mental model is two lists; sharing the OBS surface avoids two Browser Sources.  
**Alt:** One “actions” table with trigger enum (rejected for MVP UX).

### 2. Commands never award score

**Choice:** Score deltas only from `awards/grant`. `points_per_message` stays as 6a.  
**Why:** Stops `!gg` farming; operator remains the bonus source.  
**Alt:** Optional points on commands (later).

### 3. Whole-line `!` match, slug without bang

**Choice:** Store trigger `gg`; match `!` + slug after trim/lower. Extra tokens fail closed.  
**Why:** Leaves room for parameters later without treating `!gg please` as a hit now.

### 4. Hide is overlay-only, tagged on the wire

**Choice:** Always broadcast `message` with `is_command`; overlay skips render when the flag is on.  
**Why:** Admin/dock stay the operator log.  
**Alt:** Split hubs (rejected).

### 5. Seed once in Goose INSERT

**Choice:** Migration inserts four seed rows; deletes are permanent.  
**Why:** Matches “fixtures you can remove,” not a baked-in pack.

### 6. Built-in tones only; media columns nullable

**Choice:** Reuse `chime|ping|soft|alert` or empty; `image_asset`/`sound_file` null unused.  
**Why:** Sound still plays in OBS via the alert page; upload is a later change.

### 7. Event `viewer_id` rewritten on merge

**Choice:** Rewrite `interaction_events.viewer_id` from source to target in the merge transaction.  
**Why:** Achievements should follow the canonical person.  
**Alt:** Keep original ids (harder to query).

### 8. Duplicate grants allowed

**Choice:** No unique key on message id.  
**Why:** Operator asked to allow now; revisit as a product question.

### 9. Cooldown in memory

**Choice:** Process-local map.  
**Why:** Simple; a restart resetting cooldown is fine for a local stream tool.

## Risks / Trade-offs

- **[Risk] Alert audio autoplay in OBS** → Document “Control audio via OBS”; play on WebSocket event after the source has been visible. Preview uses a user gesture in Studio.
- **[Risk] Theme gap on a new surface** → Implement every current theme; extend `obs-overlay-themes` skill.
- **[Risk] Queue stampede** → Cap 20 waiting; drop oldest waiting.
- **[Trade-off] In-memory cooldown** → Not fair across process crashes; acceptable.
- **[Trade-off] No event GET API** → Achievements need a later read path; table is still the source of truth.

## Migration / Rollout / Rollback

- New Goose version: `commands`, `award_types`, `interaction_events`. Additive.
- Config: additive `hide_command_messages`.
- Rollback: previous binary ignores new tables and the config key; deleting seed rows is not undone by rollback.
- README: `/overlay/alert`, hide flag, Reward in dock. CHANGELOG Unreleased (RU).

## Open Questions

- Should a second reward on the **same message id** be forbidden? Allowed in this change; revisit with achievements / anti-double-click.
- Command parameters and custom media: out of scope; columns reserved.
- Whether to default `points_per_message` to 0 so the board is reward-only: not in this change.
