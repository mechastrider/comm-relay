## Context

See `proposal.md` for motivation. Today the hub tags `is_command` via `Lookup` on the chat `message` frame, while ingest alone calls `TryFire`. Cooldown suppressions increment diagnostics and a Debug log; clients never learn the status. Connectors are ingest-only. Command cooldown is already process-local and resets on restart.

Message broadcast and command fire run on different bus subscribers, so the `message` frame can precede the outcome. Overlay already attaches late award highlights by platform plus source id (`reward-highlight.js`); cooldown chrome should follow that pattern.

## Goals / Non-Goals

**Goals:**

- One authoritative `fired` / `cooldown` decision per matched enabled command.
- A follow-up `/ws` `command_outcome` frame that does not delay chat ingest.
- Overlay: 5 s frozen cooldown row, no timer; admin/dock: accepted vs frozen with countdown.
- Independent overlay cooldown visibility flag; successful-command hide unchanged.
- Reload restore from a process-local map while the process lives.

**Non-Goals:**

- Platform chat replies, aliases/typos, SQLite cooldown persistence, overlay countdown, Studio duration slider, unknown-command feedback, empty-identity overlay rows.

## Component / Process / IPC Boundaries

```text
connectors → bus ChatMessageReceived
                 ├─ websocket-hub: Lookup → message { is_command }
                 └─ viewer-ingest: Lookup → TryFire (only here)
                                    → alert / leaderboard on fired
                                    → remember outcome + Broadcast command_outcome

GET recent messages → overlay-assets-free JSON with optional command_outcome
config.json → hide_command_messages + hide_command_cooldown_overlay
              → overlay_settings on save
```

No extra OS process. Desktop and headless share the HTTP app.

## State and Event Flow

1. Hub `Lookup` tags the live `message` (`is_command`) without consuming cooldown.
2. Ingest `Lookup` + `TryFire`. On fire: existing alert or leaderboard request, interaction event, Info log, `commands_fired`. On cooldown: Debug log, `commands_suppressed.cooldown`, no alert/event.
3. Ingest records `{platform, id} → {trigger, status, until}` in a bounded in-memory map and broadcasts `command_outcome` with `cooldown_remaining_ms` from that clock.
4. Overlay matches the frame to a chat row (buffer briefly if the message is late). Cooldown + overlay flag off → frozen class for 5000 ms, then remove that row if it was cooldown-only / expire the freeze. Fired outcomes do not change overlay hide behavior.
5. Admin/dock apply accepted/frozen classes; cooldown rows tick remaining seconds from `cooldown_remaining_ms` plus local receipt time.
6. Recent GET copies the map and recomputes remaining ms. Restart drops the map and cooldown clock.

## Threading / Async / Cancellation

Outcome map and cooldown clock share the matcher mutex (or one mutex next to it). Broadcast stays on the ingest goroutine after `TryFire`. Overlay/admin timers are client-side. Shutdown drops in-memory state.

## Security and Trust Boundaries

Localhost-only. No new secrets. Outcome frames carry trigger, status, remaining ms, and message ids — not chat bodies at Info. Overlay text remains the viewer's own line.

## Decisions

### 1. Follow-up `command_outcome` frame, not delayed `message`

**Choice:** Keep chat latency; attach by `message_platform` + `message_id`.  
**Why:** Hub must not call `TryFire`; ingest already owns cooldown. Packet forbids dual `TryFire`.  
**Alt:** Block hub until ingest decides (adds coupling and latency). Rejected.

### 2. Process-local outcome map keyed by platform + id

**Choice:** Remember last outcomes in memory (bounded, overwrite per id) so recent GET can restore after F5. Refresh `cooldown_remaining_ms` from the cooldown clock at read time.  
**Why:** Packet requires restore while the process lives; inferring “frozen” from the cooldown clock alone would also freeze the original fired line.  
**Alt:** Persist to SQLite (out of scope). Alt: cooldown clock only (wrong fired/cooldown distinction).

### 3. Overlay freeze is 5000 ms, constant, no timer

**Choice:** `COMMAND_COOLDOWN_OVERLAY_MS = 5000` in overlay JS; frozen visual similar to reward highlight (class + opacity/pulse, reduced-motion safe).  
**Why:** Packet: short visibility, not a Studio slider, no overlay countdown.  
**Alt:** Reuse `message_ttl_seconds` (too long / operator-configurable). Rejected.

### 4. `hide_command_cooldown_overlay` default false

**Choice:** New config boolean beside `hide_command_messages`; default false = show short overlay cooldown; true = hide overlay cooldown only. Broadcast both on `overlay_settings`.  
**Why:** Packet: default cooldown flash even when successful commands are hidden.  
**Alt:** Reuse `hide_command_messages` for both (cannot flash cooldown while hiding successes).

### 5. Countdown only in admin and dock

**Choice:** Operator surfaces tick remaining seconds; overlay never does.  
**Why:** Packet. Stream chat stays readable; operator still sees the wait.

### 6. No connector send path

**Choice:** Outcomes stay on `/ws` and local UI.  
**Why:** Connectors are ingest-only; specs already forbid platform replies on suppress. Packet lists this as out of scope.

## Risks / Trade-offs

- **[Risk] Outcome arrives before `message`** → Overlay/admin buffer outcomes by platform+id until the row exists or a short timeout.
- **[Risk] Missing source id** → Same as deletion: do not invent an id; skip attach/restore for that line; still broadcast if platform+id are present, otherwise skip the frame and keep logs/counters.
- **[Trade-off] Overlay 5 s vs message TTL** → Cooldown overlay rows leave after 5 s even when TTL is longer or zero.
- **[Trade-off] Restart clears restore** → Matches current cooldown; documented.

## Migration / Rollout / Rollback

- Additive JSON: new WS type, optional recent field, new config key default false.
- Old overlay/admin ignore unknown WS types and extra config keys.
- Rollback: previous binary ignores new frames and the new config key; cooldown suppressions return to log-only.

## Open Questions

None. Packet 1 in `docs/research/operator-follow-up-changes.md` and INT-034 lock channel, statuses, overlay vs admin, restore, and non-goals. Aliases/typos remain packet 4.
