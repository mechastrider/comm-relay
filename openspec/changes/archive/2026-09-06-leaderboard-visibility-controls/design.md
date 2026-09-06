## Context

Production leaderboards currently render whenever their OBS source is visible. Ranking data frames are broadcast for XP changes and message-count-only changes, so data delivery cannot double as a meaningful display trigger. Commands are user-owned SQLite rows whose only action is an alert splash. The dock is an operator-only message log and already shares `/ws` and active-preset APIs with admin.

## Goals / Non-Goals

**Goals:** one global visibility policy; synchronized hidden/timed/pinned state; bounded automatic triggers; manual dock control; optional viewer command action; compatibility for current installs and commands.

**Non-Goals:** OBS WebSocket or scene control, remote access, per-preset visibility, a seeded `!leaderboard`, XP/rank calculation changes, or exact coordination with a backlog of queued alert splashes.

## Component / Process / IPC Boundaries

A new internal visibility controller owns runtime state, deadlines, cooldown, dirty tracking, and delayed award requests. Bootstrap registers it as a cancellable runnable and injects it into HTTP handlers and the message/award pipeline. Typed bus events carry visibility snapshots to the existing production WebSocket hub. Config stores global policy; SQLite stores command action. Browser clients render state but never invent it.

## State and Event Flow

```text
config policy + XP/award/command/manual events
                    |
                    v
        leaderboard visibility controller
          hidden <-> timed <-> pinned
                    |
          bus visibility snapshot
                    |
       /ws -> leaderboard + dock/admin
```

Manual HTTP actions call the controller and return its resulting snapshot. Award and XP mutation paths submit typed reasons rather than generic ranking frames. New `/ws` clients receive the current snapshot. The leaderboard uses `visible_until` for animation/countdown but obeys later authoritative frames.

## Threading / Async / Cancellation

The controller uses one owner goroutine, a bounded command channel, and one reusable timer for the nearest deadline/delayed award. It coalesces dirty updates and repeated show requests; it MUST NOT allocate a goroutine or timer per chat line. Context cancellation stops the timer and returns cleanly. API calls receive bounded acknowledgements and map unavailable/shutting-down state to UI-safe errors.

## Security and Trust Boundaries

All control routes remain localhost HTTP and use bounded JSON. Durations and enum values are validated. Viewer commands can only request the global timed display; they cannot pin, hide, change presets, or supply arbitrary duration. No connector or chat content enters HTML unsanitized.

## Decisions and Alternatives

1. **Global policy, runtime override.** Appearance stays per preset, but operational visibility is global so dock status and every production source agree. Per-preset state was rejected because `/ws` has no client subscription identity and would make controls ambiguous.
2. **Separate visibility envelope.** Ranking data never implies show/hide. This prevents message-count-only frames from flashing the board and preserves older clients.
3. **Server owns deadlines.** Client-local timers were rejected because multiple OBS sources and dock would drift and reconnect inconsistently.
4. **Three policies, composable triggers.** Always, automatic, and on-request describe baseline behavior; awards, rank changes, interval, command, and manual controls are causes, not competing modes.
5. **Meaningful automatic change is XP-driven leader/top-three change.** Other XP changes set dirty; message-only changes do neither. This keeps XP central and prevents chat volume from causing noise.
6. **Policy-specific dock controls over the same four API actions.** `always` uses one labelled visibility switch (`hide` when off, `resume` when on). `automatic` and `on_request` use timed Show, a Pin toggle (`pin`/`resume`), and Hide; no standalone Auto/Resume button is shown. Show is unavailable while pinned, but Hide remains an emergency action. This makes the baseline policy understandable without removing the compatible localhost API.
7. **Hide is persistent only for the always-visible baseline.** Under `always`, Hide remains an override until Resume. Under `automatic` and `on_request`, Hide clears pin/show overrides and starts cooldown without indefinitely blocking later triggers; on-request commands can therefore show again later. Manual Show and Pin bypass cooldown.
8. **Award delay uses the triggering alert duration.** This avoids overlap in the common single-alert case without duplicating the page-local alert queue. Full queue acknowledgement is deferred.
9. **Command action column.** Extending the user-owned catalog reuses trigger uniqueness and per-viewer cooldown without reserving `!leaderboard`. Existing rows default to `alert`; no seed is added.
10. **Existing installs default always; new installs automatic.** Presence-aware config loading prevents an upgrade from unexpectedly hiding a current source.

## Risks / Trade-offs

- A burst of alerts can outlast the simple award delay and overlap the board; document this limitation.
- Hot rank changes during cooldown can leave dirty state; the fallback interval and next eligible meaningful trigger recover it.
- A stalled client may miss a transition; reconnect snapshot restores state.
- Adding command action makes catalog validation conditional and needs focused migration/API/UI tests.
- Dock toolbar reduces vertical message space; use a compact fixed header and scroll only the message body.

## Migration / Rollout / Rollback

Append migration `00013_commands_action.sql` with non-null `action` default `alert`; never edit prior migrations. Config loading distinguishes absent visibility settings in an existing file from defaults written for a new file. Rollback binaries ignore the new config object and SQLite column. Runtime state is intentionally ephemeral. Update Russian/English README/FAQ behavior, docs concept where leaderboard operation is described, and the Russian Unreleased section without rewriting versioned history.

## Open Questions

None blocking. Alert-queue completion acknowledgement may be explored separately if real OBS testing shows objectionable overlap.
