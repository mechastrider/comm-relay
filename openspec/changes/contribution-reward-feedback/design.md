## Context

The current reward path posts viewer identity plus award id, updates SQLite score, broadcasts an `alert` frame, schedules leaderboard snapshots, and appends an interaction event. The request already accepts a message id, but the alert frame omits message context. The chat overlay ignores alerts, the alert page owns a client-side FIFO, and Live Leaderboard/Statistics read HTTP snapshots without applying existing leaderboard frames. Overlay presets already support a shared `style.panel_opacity` and leaderboard surface overrides.

This change strengthens the manual Contribution Reward loop without introducing the future Score/XP/Credits model or Reward Library.

## Goals / Non-Goals

Goals:

- Preserve why an operator granted an award through transient, safe on-stream feedback.
- Keep manual awards visible under command bursts without overlapping alerts.
- Make active admin rankings react to existing live events.
- Let each OBS surface tune background chrome independently within one preset.
- Preserve existing routes, SQLite data, connector behavior, themes, and old clients.

Non-goals:

- Persistent chat text, saved moments, economy migration, activity rules, achievements, redemptions, custom media, new template variables, alert layout types, broad Audience/table navigation redesign, or OBS scene control.

## Component / Process / IPC Boundaries

- Admin and dock continue to call `POST /api/awards/grant`; they add optional selected-row `message_id` and `message_text`.
- The server remains authoritative for identity resolution, score mutation, interaction-event append, template resolution, quote bounding, and WebSocket broadcast.
- SQLite keeps only the existing message platform/id reference. `config.json` keeps additive preset surface-opacity overrides.
- `/ws` keeps one backward-compatible `alert` envelope. Chat consumes only message-aware award metadata; alert consumes presentation/scheduling fields; unrelated clients ignore it.
- Each `/overlay/alert` Browser Source owns its local display scheduler, as it does today. No durable replay or server-side OBS state is added.

## State and Event Flow

```text
Live or dock row
  -> POST award grant (+ optional id/text snapshot)
  -> atomic score update
  -> append durable award fact (no text)
  -> broadcast enriched award alert
       -> chat: exact visible-row highlight
       -> alert: award lane -> themed splash + quote
  -> existing leaderboard publisher
       -> Live Leaderboard snapshot / debounced Statistics refresh
```

The server trims the quote and truncates it to 280 Unicode code points before constructing the event. A missing stable id suppresses only chat-row highlighting; it does not suppress the award or quote.

The alert scheduler holds one visible item plus FIFO `awards` and `commands` arrays with a combined pending cap of 20. Before selection or insertion it removes commands older than 10 seconds using `created_at`, or local receive time for legacy frames. Selection always prefers the oldest award. At capacity, awards displace commands first; commands never displace awards.

## Threading / Async / Cancellation

Award grant remains a synchronous HTTP action followed by bounded WebSocket broadcasts. Existing leaderboard publication coalescing remains responsible for score snapshots. The admin caches only the newest snapshot per period; rendering is limited to the active tab. Statistics invalidation uses one cancelable/debounced refresh with a one-second minimum interval, and workspace changes abort obsolete HTTP work.

Alert timers and highlight timers are page-local. Reloading an overlay cancels them naturally and does not replay missed events. Repeated awards restart the matching row's 2.5-second highlight without duplicating the chat row.

## Security and Trust Boundaries

The server treats `message_text` as untrusted local input: request size remains bounded, UTF-8 is normalized through normal JSON decoding, the quote is trimmed/truncated, and clients render it only with text nodes. The quote MUST NOT enter logs, SQLite, diagnostics, or error responses. Message matching uses exact platform plus stable id and never display names or text. Surface opacity cannot alter `html`/`body` transparency, and config validation rejects values outside 0–1.

## Decisions and Alternatives

1. **Extend `alert` instead of adding `award_granted`.** Optional fields preserve compatibility and let the chat and alert surfaces react to one event. A second event would create ordering and deduplication questions.
2. **Carry a bounded row snapshot instead of reading server history.** The selected row is the best available context even if it has scrolled out of the server ring. Server-side bounding contains memory/privacy impact. Looking up history would fail during normal retention races.
3. **Keep scheduling in the alert client.** This preserves the stateless WebSocket model and multiple Browser Source support. A server-side redemption queue belongs with Reward Library, where acknowledgements and refunds exist.
4. **Use one visible hero alert with priority lanes.** Simultaneous cards or a vertical stack compete with gameplay and sound. Strict FIFO allows stale commands to hide manual recognition.
5. **Make only commands expire in this slice.** Ten seconds is the initial relevance budget. Awards remain protected by priority and the hard pending cap; tuning/configuration follows live QA.
6. **Store per-surface opacity as optional overrides.** Runtime fallback to shared opacity makes old configs safe and rollback simple. Eagerly rewriting every preset adds no observable benefit.
7. **Reuse leaderboard frames.** A new statistics event is unnecessary until richer historical aggregates exist.

## Risks / Trade-offs

- Separate Browser Sources can diverge after a local reload or dropped frame; this already applies to live alerts and remains acceptable until durable redemptions.
- Award priority can starve commands during an unusual reward burst. Manual recognition is intentionally higher value; the pending cap prevents unbounded memory.
- A local client could submit quote text different from the source row. This does not affect score identity or durable facts, but it can affect transient copy. The localhost operator boundary and lack of remote API authentication make this consistent with current trust assumptions.
- Per-theme award variants and opacity must be verified across every current theme, both leaderboard layouts, long Cyrillic text, and reduced motion.
- Debounced Statistics refresh still performs HTTP reads during active use, but bounds them to one per second rather than one per event.

## Migration / Rollout / Rollback

No SQLite migration is required. Old config files omit surface opacity and resolve to shared `style.panel_opacity`; Studio may materialize unchanged effective values on the next publish. New optional request and WebSocket fields do not break old clients. Rollback ignores additive config fields and restores FIFO presentation without data loss. User-visible behavior requires a Russian `[Unreleased]` changelog entry during implementation.

## Open Questions

No blocking product question remains for implementation. The 10-second command relevance budget and 280-code-point quote limit are starting values to validate in an OBS smoke test and a real stream; making them operator-configurable is explicitly deferred.

When streamer identity is added in a later template-focused change, its base value SHALL be global. Whether an overlay preset may override that global streamer name remains open and is deliberately outside this iteration.
