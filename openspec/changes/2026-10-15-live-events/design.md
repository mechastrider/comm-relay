## Context
The admin is React/TypeScript and viewer data already lives in SQLite (older config context descriptions are stale). Interaction events persist facts; achievements persist unlocks; level transitions currently exist only as transaction results. Old likes do not persist their giver or a correlation to their command row.

## Goals / Non-Goals
Implement the approved Events tab; keep dock mode switching as backlog only. No chat archive, sounds, notifications or additional runtime services.

## Component / Process / IPC Boundaries
Store owns normalized read projection, API exposes a bounded GET, React owns polling and reading state. Existing write transactions add attribution/hidden-command metadata and level snapshots.

## State and Event Flow
Union interaction events, live achievement unlocks and durable level transitions. Social commands carry an explicit hidden-in-feed flag, awards record the giver; buffs already retain both viewers. Preserve existing facts and progression metrics. Filter before pagination. Timestamp and prefixed stable id provide deterministic order.

## Threading / Async / Cancellation
Use existing store mutex/transaction boundaries. HTTP reads use context cancellation. UI polls sequentially, aborts on unmount/filter change, and discards stale responses. Freeze displayed rows while reading older content; refresh latest on demand.

## Security and Trust Boundaries
Expose only curated names/action/points/time. Never expose chat text or message ids. Render as React text. Same-origin local API; no new privileges.

## Decisions and Alternatives
Reuse durable facts rather than a second duplicated event journal. Add a small level-transition table because replaying current level catalogs cannot reconstruct historical transitions. Poll instead of adding WebSocket traffic: durable reads recover missed updates and keep bus/overlay behavior unchanged. Newest-first feed avoids automatic scroll jumps at the latest position.

## Risks / Trade-offs
Legacy like attribution is unavailable: retain historical raw command/award facts and explain that older actions can be separate. Level history starts at upgrade. Do not infer attribution from timestamps or mutable catalogs. Loaded history is user-requested; individual requests are bounded.

## Migration / Rollout / Rollback
Add nullable actor id and default-false hidden flag to interactions; create indexed level transition table. No historical attribution backfill. Reuse the existing session index for live achievements. Down migration removes only new metadata/history; existing XP, facts and unlocks survive. Older writers default to generic history, with no fabricated metadata. Backup database before downgrade.

## Open Questions
None blocking. Existing dock mode switching is explicitly deferred.
