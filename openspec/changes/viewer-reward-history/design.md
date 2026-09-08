## Context

Award grants currently update viewer XP in one store transaction and append an `interaction_events` row afterward. The event contains `award_id` and points but no award-name snapshot. Events are queryable internally by viewer in ascending order, while the local API and Audience UI expose no journal. Award types are user-owned and may be renamed or deleted, so a later join against the catalog cannot reliably explain historical grants.

The existing Audience workspace has Viewers, Commands, and Awards tabs. Viewer detail renders in a scrollable wide inspector or compact modal sheet from `GET /api/viewers/get`. This change adds a read model to those existing surfaces; it does not add an OBS or native desktop surface.

## Goals / Non-Goals

**Goals:**
- Make successful manual award grants auditable globally and per canonical viewer.
- Preserve the award name as it was shown when granted.
- Bound reads with deterministic cursor pagination.
- Keep grant XP and journal persistence consistent.
- Fit the current localized, accessible vanilla admin patterns.

**Non-Goals:**
- Achievement evaluation or unlock storage, donation and streak events, award-history mutation, chat retention, source-message recovery, analytics totals, export, filters beyond viewer scope, or live WebSocket delivery.
- Changes to XP values, limits, leaderboard behavior, connectors, OBS pages, dock behavior, Wails APIs, installers, or `config.json`.

## Component / Process / IPC Boundaries

```text
POST /api/awards/grant
  -> SQLite transaction: identity + XP + award interaction event
  -> commit
  -> existing alert broadcast and leaderboard scheduling

SQLite interaction_events + current canonical viewer
  -> paginated store query
  -> GET /api/reward-history
  -> Audience History tab / viewer detail section
```

The localhost HTTP server remains authoritative. Browser admin and Wails WebView use the same endpoint. There is no native IPC, external service, connector-specific branch, or new WebSocket frame.

## State and Event Flow

1. The grant handler validates the award and supplies its current id, name, points, optional source reference, and timestamp to one store operation.
2. The store applies identity/XP changes and inserts the award event in the same transaction. Commit failure leaves both absent.
3. After commit, the handler performs the existing alert broadcast, diagnostics/logging, visibility scheduling, and leaderboard publication.
4. History reads select only `kind = 'award'`, join the current canonical viewer, and order by `(created_at DESC, id DESC)`.
5. The API maps `award_id` and the stored name snapshot to generic `reward_id` and `reward_name` fields. This keeps the read model extensible without defining achievement persistence now.
6. Global and per-viewer UI own independent cursors. Refresh replaces a list; Load more appends the next page.

## Threading / Async / Cancellation

Store writes and reads continue under the existing store mutex; no goroutine or background worker is added. Queries fetch at most 101 rows to determine whether a requested page of at most 100 has a successor. Viewer-detail requests use an `AbortController` or selected-viewer generation check so stale responses cannot cross viewer boundaries. Global refresh and pagination disable duplicate in-flight actions and ignore superseded responses.

## Security and Trust Boundaries

The endpoint is local and read-only but still validates `limit`, cursor, and viewer id. Cursor content is an opaque base64url encoding of timestamp plus event id, not trusted SQL. Queries remain parameterized. Responses contain current canonical display name and reward facts only; they exclude platform user ids, source-message ids, command triggers, chat text, and catalog templates. UI renders names with DOM `textContent` and localized fixed labels.

## Decisions and Alternatives

1. **Store `reward_name` on the interaction event.** This preserves historical meaning across catalog rename/delete. Joining only the current catalog was rejected because deleted rows become unintelligible and renamed rows rewrite history.

2. **Backfill old award rows with current catalog name, then award id.** Exact deleted historical names cannot be reconstructed. Dropping old entries or showing an empty label was rejected because either loses evidence or produces unusable rows.

3. **Make XP and event insertion atomic before broadcasting.** A journal cannot be authoritative if a successful grant may update XP while silently missing its event. Keeping the current best-effort append was rejected.

4. **Use one read endpoint with optional viewer scope.** Separate global and viewer routes would duplicate pagination semantics. `GET /api/reward-history?viewer_id=...` follows the project's query/body identifier rule.

5. **Use opaque keyset pagination, not offsets.** `(created_at, id)` avoids duplicates and skipped rows when newer grants arrive between requests. Offset pagination was rejected for a growing append-only journal.

6. **Add an Audience History tab plus an embedded viewer section.** The tab answers channel-wide “who received what”; the viewer section answers “what did this person receive” without navigation. Reusing the Awards catalog tab was rejected because catalog configuration and grant history are different operator tasks.

7. **Ship award entries only.** The generic response can later admit an `achievement` kind, but defining empty achievement tables or UI now would couple this bounded change to INT-012.

## Risks / Trade-offs

- Legacy deleted awards can only show their stable id; the migration makes that limitation explicit and non-empty.
- A separate History tab adds one Audience navigation item; clear “Award types” versus “History” labels reduce ambiguity.
- Holding the existing mutex during bounded joined reads may briefly serialize writes; supporting indexes and a 100-row cap keep work bounded. Revisit only with measured contention.
- No live feed means an already-open journal requires Refresh after a grant from another surface. This keeps the first version simple and avoids another WebSocket contract.

## Migration / Rollout / Rollback

Add the next immutable Goose migration with nullable `reward_name`, backfill every award event to `COALESCE(current award name, award_id)`, then enforce new-write non-empty validation in Go. Do not edit earlier migrations. Existing command/activity rows retain null. Add a descending-compatible index on `(kind, created_at, id)`; retain the viewer index or replace it only if query plans and migration tests prove the new composite viewer index covers existing uses.

Rollback removes the new index and column if supported by the project's SQLite/Goose baseline; XP and existing event rows remain. A previous binary ignores the added column. The new admin against an older server shows its normal history error state. No `config.json`, OS registration, or packaged artifact changes occur.

## Open Questions

None blocking. Exact compact row styling is delegated to `ui_contract.md`; the public field set and pagination behavior are fixed by the delta specs.
