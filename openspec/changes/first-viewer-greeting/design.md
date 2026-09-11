## Context

Viewer ingest already resolves stable platform identities into canonical viewers, opens a durable stream session, increments period counters transactionally, matches commands, and publishes alert frames. The current mutation result does not expose first-message state, and command cooldowns are in-memory behavior rather than a suitable greeting contract. The existing alert renderer and catalog presentation fields provide the visual vocabulary this change should reuse.

## Goals / Non-Goals

Goals are deterministic first-ever and first-in-session qualification, independent operator control, complete command-equivalent presentation, per-viewer exclusion, restart safety, isolated preview, and useful diagnostics. Non-goals are XP, early-arrival rewards, platform replies, automatic stream detection, a generalized trigger engine, and another OBS source.

## Component / Process / IPC Boundaries

The local SQLite store owns greeting definitions, canonical-viewer exclusion, and qualification markers. Viewer ingest classifies command matches before one transactional chat mutation and receives a committed greeting outcome. The API exposes catalog/update/preview actions. Production greetings use the existing Hub and `/ws`; preview uses only the dedicated overlay-debug audience. `/overlay/alert` remains the sole production renderer.

## State and Event Flow

```text
ChatMessage → command classification → transactional viewer mutation
                                      ├─ counters/activity
                                      ├─ ordinary-message markers
                                      └─ greeting outcome (none/new/returning)
                                                     │
                         enabled + not excluded ─────┘
                                                     ↓
                               resolved alert frame → production Hub
```

The transaction consumes eligibility even when a definition is disabled, the viewer is excluded, or no WebSocket client accepts the later frame. A first-ever outcome supersedes returning for the same line. Command matches do not set ordinary-message markers.

## Threading / Async / Cancellation

Qualification stays inside the store's existing serialized transaction boundary so concurrent lines cannot emit two greetings. Alert broadcast remains best-effort after commit; cancellation or a full client queue never rolls back viewer state. Media caching remains asynchronous and follows existing avatar behavior.

## Security and Trust Boundaries

All routes remain localhost-only and accept bounded JSON. Greeting assets must be generated filenames already present in the overlay-assets directory. Templates render as text, never HTML. Preview is fail-closed onto `/ws/overlay-debug`; it cannot route to production or mutate persistent state.

## Decisions and Alternatives

1. **Store two fixed definitions in SQLite.** This matches user-owned command/award catalogs while preventing arbitrary greeting-rule growth. Config JSON was rejected because greeting state and referenced catalog assets already belong with viewer interaction data.
2. **Track ordinary-message markers separately from message counters.** Existing counts include commands, while recognized commands must not consume greeting eligibility. Inferring from a count was rejected as incorrect after restart and upgrade.
3. **Consume eligibility independent of delivery.** This prevents enabling a feature or reconnecting OBS from greeting established viewers retroactively. Delivery receipts were rejected because overlays are best-effort and may have multiple clients.
4. **Use canonical viewers and union state on merge.** This prevents cross-platform duplicate greetings. Exclusion uses logical OR on merge as the conservative choice.
5. **Reuse the expiring command queue lane with explicit `source: greeting`.** Greetings stay subordinate to protected awards/contracts without adding a third scheduler policy.
6. **Use the isolated overlay-debug audience for Test.** Production preview was rejected because synthetic greetings could appear on-air.

## Risks / Trade-offs

- Existing current-session message counts cannot prove which lines were commands; migration conservatively marks any viewer with prior session messages as already seen.
- A viewer whose first ordinary message occurs while greetings are disabled will never receive a retroactive new-viewer greeting; this is intentional surprise avoidance.
- Preview depends on the dedicated overlay-debug infrastructure; implementation should land after `studio-overlay-test-tools` is complete or include the missing prerequisite work explicitly.
- An exclusion applied after a brand-new bot speaks cannot prevent that first alert; it prevents later session greetings.

## Migration / Rollout / Rollback

The migration inserts both disabled definitions, adds viewer exclusion with false default, and creates durable ordinary-message markers. Existing viewers are treated as known; viewers with current-session messages are conservatively treated as seen in that session. Rollback may leave additive tables/columns unused; older binaries ignore them. Uploaded assets remain managed by existing reference checks. The user-visible change requires an Unreleased changelog entry during implementation.

## Open Questions

None blocking. Default localized templates and built-in emblems may be refined during implementation without changing the behavioral contract.
