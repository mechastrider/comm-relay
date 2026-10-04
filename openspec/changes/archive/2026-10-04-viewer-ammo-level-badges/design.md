## Context

Approved mockup: docs/mockups/viewer-ammo-levels.html. Current chat frames have platform/user ids but no progression state. Chat fanout and viewer ingest run independently. Leaderboard and Audience already receive level metadata. React admin is the current implementation despite older configuration context describing static admin.

## Goals / Non-Goals

Implement the agreed first volume: chat, leaderboard, viewer detail and editor, default-enabled independent switches. Preserve all gameplay and existing reward/cooldown indicators. No dock/live-row expansion or new alert presentation.

## Component / Process / IPC Boundaries

Store owns quota accounting and level icon persistence. API supplies bounded read-only snapshots through POST /api/viewers/status and includes status in viewer detail. Shared browser utilities render badges/ammo; static overlay and React wrappers reuse them. No native IPC changes.

## State and Event Flow

Chat requests deduplicated visible identities on message/outcome/leaderboard updates and after restored history, with a four-second polling fallback and coalesced 150 ms scheduling. Server resolves canonical identities and calculates level and quotas under the store lock. A single in-flight request plus coalesced refresh prevents stale response overtaking; removed identities are pruned. Snapshots update every visible row of a viewer. Preview/debug use synthetic states only.

## Threading / Async / Cancellation

Reuse the store mutex for coherent session/level/use reads. Bound lookup size to 100 and chunk larger visible lists. Coalesce browser requests; stop timers and abort fetches on unload. No extra Go worker or background goroutine.

## Security and Trust Boundaries

Emblems are allowlisted ids rendered as local SVG, never markup or external URLs. Text uses safe DOM/React rendering. Status lookup is read-only and obeys existing local API access controls. Failure logging excludes chat bodies.

## Decisions and Alternatives

- Use optional boolean fields so absent defaults true while explicit false survives normalization and preset cloning.
- Use a stable persisted emblem id; do not derive icons from mutable titles or quota size.
- Use bounded snapshots rather than assuming chat frame order or counting received commands. Four-second fallback covers edits, merges and session resets without a broad event-system refactor.
- Eight cartridges is the presentation cutoff from the approved mockup. Large capacities retain numeric mode even when only one use remains.
- Display current state on all visible messages; do not imply old messages are immutable quota receipts.

## Risks / Trade-offs

Snapshot requests add bounded local reads; coalescing and identity deduplication avoid one request per row. Initial ingest can race lookup, so missing identities remain undecorated until refresh. HTTP errors clear stale visual state and are retried. Narrow themes need explicit wrapping checks.

## Migration / Rollout / Rollback

Add a migration for level emblem, backfill starter ids, neutral shield for custom rows. Preserve emblems in older update requests that omit the field. Missing config switches mean enabled. Downgrade requires the usual database backup/compatible migration procedure; toggles can disable new on-stream UI without data loss.

## Open Questions

None blocking. The user authorized implementation and enabled-by-default visibility. The eight-cartridge threshold is adopted from the reviewed mockup.

Successful level catalog mutations broadcast viewer_status_changed so leaderboard and chat refresh immediately. Chat sources show an award footer only when feedback is present. Removing the empty reservation keeps the header at its normal top inset. A visible footer increases card height while preserving body width and its offset within the card.

The user refined the layout: name/platform/avatar on the left and one right-aligned emblem/ammo group, wrapping as a whole if needed. The body always spans the full content width. Avatars belong to the name cluster so wrapped status can use the full header width.
