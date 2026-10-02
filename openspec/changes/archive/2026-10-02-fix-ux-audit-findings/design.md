## Context
The audit was performed on 946dfbf; main now includes the report. Current admin is React/TypeScript despite stale vanilla wording in OpenSpec config. The user explicitly requested implementation, so planning continues into apply in this task.

## Goals / Non-Goals
Resolve all eleven findings, preserve drafts, IDs, semantic tables and keyboard access. No API contract or stored-data changes or visual redesign. One additive index migration improves existing reads.

## Component / Process / IPC Boundaries
UI changes are within the admin and locale assets. The viewer list handler also resolves levels from the existing all-time XP snapshot against one catalog read instead of three SQL reads per viewer. Existing GET catalogs supply achievement options. Viewer directory retains its current GET contract.

## State and Event Flow
Viewer sorting operates on the full fetched result; 50-row client pages bound mounted DOM. Search, period or sort resets the page; a shrinking result clamps the page. Page actions retain focus and inspector focus returns to the opener; dirty inspector changes use the existing confirmation flow.
Settings feedback carries a section and is displayed only in that section, including asynchronous OAuth completion. Fetch transport failures use a typed error mapped to localized save guidance; API validation retains field errors.
Achievement options depend on the selected metric, display award names or command triggers, and submit existing IDs. A saved missing ID remains selectable with an explicit unavailable label. Switching metrics clears an incompatible subject deliberately; catalog failures show retry and never clear a saved value.

## Threading / Async / Cancellation
Reuse resource cancellation and in-flight save guards. Memoize viewer sorting to avoid recomputing on unrelated state renders. No new background work.

## Security and Trust Boundaries
React text escaping remains authoritative. No credentials, seed data, or external requests are added.

## Decisions and Alternatives
Use client pagination instead of virtualization: semantic table, predictable keyboard behavior and no dependency. It bounds DOM; final measurements isolated an additional server N+1 level lookup, so resolve the directory against one sorted level catalog using binary search per viewer. EXPLAIN also showed a full identity scan and temporary sort for each correlated lookup; add the covering-order identity index through migration 00022. Reuse ListProgressionLevels, preserve threshold and ID tie-break behavior, return the same JSON and retain error logging. Measure request and display timings separately.
Use native subject selects instead of free-form IDs. Preserve missing IDs to avoid changing existing rules silently. Use valid group roles for media previews, and native complementary semantics for desktop inspector.
Raise the semantic muted token, not an arbitrary global text override. Restore compact flex sizing only below the rail breakpoint.

## Risks / Trade-offs
Client fetch/sort still scales with the full result. Page changes must not bypass a dirty inspector guard. Shared contrast changes require checking all audited backgrounds. Native WebView smoke remains a release follow-up where unavailable.

## Migration / Rollout / Rollback
Migration 00022 adds a non-unique (viewer_id, last_seen_at DESC) index without rewriting data. Down drops only this index; upgrade/down/reapply is covered with existing identities. Existing IDs and payload shapes remain valid. Application rollback rebuilds assets; downgrade migration removes the new index where a prior migration runner requires it.

## Open Questions
None blocking implementation. Actual channel size/p95 remains a future measurement question, not a claim in this fix.
