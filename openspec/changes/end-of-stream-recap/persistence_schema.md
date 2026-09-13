# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite database | `internal/store`: sessions, viewer aggregates, interaction events, achievement unlocks, immutable recap snapshots | Existing database beside the effective CommRelay data/config location; included in the same user backup/portable-data behavior | Existing Goose-managed SQLite schema plus migration `00019`; RFC3339 timestamps and versioned JSON snapshot payload | Local viewer identities, aggregate activity, authored public display text; no new raw chat or credentials |
| `config.json` | `internal/config`: optional per-preset recap backdrop opacity | Existing executable-adjacent or user config directory according to current host behavior | Existing JSON overlay-preset object gains optional `surfaces.recap.panel_opacity` | Ordinary operator appearance preference |
| Process memory | Recap runtime controller: hidden/visible plus visible snapshot | Process-local and deliberately non-portable | Lock-protected runtime state; initialized hidden | Public recap DTO only; not durable |
| Embedded web assets | Build/static server: recap HTML/CSS/JS and theme mappings | Existing embedded/static `web/` asset path | Versioned application assets, not user data | None |

## Changed Structures / Formats

### SQLite migration `00019_stream_recaps.sql`

The next immutable migration after `00018_interaction_event_command_id.sql` adds:

```sql
ALTER TABLE interaction_events
    ADD COLUMN session_id TEXT NULL REFERENCES stream_sessions(id);

ALTER TABLE viewer_achievement_unlocks
    ADD COLUMN session_id TEXT NULL REFERENCES stream_sessions(id);

CREATE TABLE stream_recaps (
    id TEXT NOT NULL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE REFERENCES stream_sessions(id),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_interaction_events_session_created
    ON interaction_events(session_id, created_at, id);
CREATE INDEX idx_viewer_achievement_unlocks_session_unlocked
    ON viewer_achievement_unlocks(session_id, unlocked_at DESC, id DESC);
CREATE INDEX idx_stream_sessions_started
    ON stream_sessions(started_at DESC, id DESC);
```

The migration first adds the nullable attribution columns, then performs conservative data backfill, then creates indexes. For an existing interaction row, `session_id` is set only when exactly one `stream_sessions` interval contains `created_at`. For an existing unlock, the same rule uses `unlocked_at` and additionally requires `backfilled = 0`. An interval is `[started_at, ended_at)`; a null `ended_at` has no upper bound. Zero or multiple matches leave null. Administrative/backfilled unlocks always remain null.

The down migration drops the three new indexes and `stream_recaps`, then drops both nullable attribution columns. It does not delete or rewrite existing session, viewer, event, or unlock rows.

### `stream_recaps.payload_json` version 1

The payload is the canonical immutable HTTP/WebSocket presentation snapshot. Version 1 is a snake_case object containing:

- `version`, `id`, `session_id`, `started_at`, and `captured_at`;
- `totals`: `viewer_count`, `message_count`, and `xp` non-negative integers;
- `ranking`: zero to five rows with `rank`, snapshotted `display_name`, optional resolved `portrait_url`, `xp`, `message_count`, and optional `title`;
- `achievement_groups`: zero to six rows with snapshotted viewer display data, achievement id/revision/name/description, positive occurrence count, and latest `unlocked_at`.

Application encoding uses one typed DTO shared by storage, HTTP, and WebSocket. Capture validates all cardinality/string/URL/integer bounds before insert and validates version and bounds again on read. Unknown future versions fail safely for Show and detail rendering rather than being partially interpreted. Scalar `id`, `session_id`, and `captured_at` remain duplicated outside JSON so uniqueness, lookup, and ordering never depend on JSON extraction.

### Existing records and semantics

- `stream_sessions.ended_at` retains its current meaning: the boundary created by the next explicit New stream action. It is not relabelled as end-of-stream time.
- `stream_recaps.captured_at` is the only confirmed recap cutoff/closing time.
- New live `interaction_events` receive the transaction's open session id. Any administrative event path without a causal live session must opt into null explicitly rather than reading the current session later.
- New non-backfilled live achievement unlocks receive the causal session id in the same transaction. Reconciliation/backfill unlocks remain null.
- Viewer merge updates retain attribution. When achievement uniqueness collisions collapse rows, the retained earliest unlock also retains its original nullable session id.
- Existing `viewer_session_stats` remains normalized history and is not copied into a new session-summary table.

### `config.json`

`OverlayPreset.Surfaces` gains an optional Recap surface override with nullable/presence-aware `panel_opacity`. Values must be finite and between 0 and 1 inclusive. Omission resolves a theme-specific default in memory and is not materialized merely by load or unchanged publish. Explicit zero must survive JSON round trips. Unknown keys retain the config loader's existing compatibility behavior. No database setting duplicates this value.

## Atomicity / Concurrency / Locking

- Live fact persistence resolves the open session inside the existing store serialization/transaction boundary; event/unlock attribution commits with the causal XP/stat/unlock writes or all roll back.
- First Show executes current-session compare, aggregate queries, public/privacy filtering, payload validation, and `stream_recaps` insert in one serialized transaction. The unique `session_id` constraint is the final concurrency guard.
- Concurrent first Shows converge by re-reading the row that won uniqueness; neither request may recompute and overwrite it. Snapshot rows are insert-only in application code.
- The database transaction commits before runtime visibility changes. A failed transaction leaves both stored snapshot and visibility unchanged. WebSocket broadcast occurs after the runtime state swap and outside the DB lock.
- Show carries the expected `session_id`; StartSession and Show use the same serialization boundary, so the snapshot is either committed for the still-open expected session or rejected as stale.
- Hide does not write SQLite. New stream commits its existing session transition before the controller hides and broadcasts.
- Read APIs use bounded queries and copy complete stored payloads before releasing store resources. Cursor ordering is stable on `(started_at DESC, id DESC)`.

## Encryption / Secret Storage / Privacy

No encryption or secret-store behavior changes. The local SQLite/config threat model stays unchanged. The new snapshot intentionally duplicates only public-on-stream display data and aggregate counts; it excludes raw chat, connector tokens, source-message identifiers, secret locked achievement definitions, hidden leaderboard viewers, progression-opted-out recognitions, and filesystem paths. An unlocked secret achievement may be snapshotted because it has become public under the progression contract. Logs identify operation/session/snapshot outcomes but never emit the JSON payload or user-authored text wholesale.

## Migration / Downgrade / Backup / Export

- Goose applies `00019` through the existing startup path. The migration is additive before backfill/indexing and runs transactionally under existing migration behavior.
- Migration tests cover empty/current/multiple historical sessions, exact start boundary, exclusive end boundary, missing interval, overlapping intervals, null end, backfilled unlock exclusion, and up/down/up execution.
- A normal backup of the existing data directory/database automatically includes recap snapshots and session attribution. No separate export format, import command, or cloud synchronization is added.
- Older config files remain valid. Loading them calculates recap defaults without writing. A binary predating this change ignores the optional recap JSON according to existing decoding behavior.
- Downgrading the database through Goose removes recap-specific schema/data but preserves pre-existing facts. Running an older binary against a not-downgraded additive database is expected to ignore added columns/tables; it cannot display recap history.
- Re-upgrade after an actual down migration may recreate attribution from timestamps only under the same conservative rules; deleted immutable recap payloads cannot be reconstructed exactly and require a new current-session capture.

## Corruption Recovery / Cleanup / Uninstall

- Invalid JSON, unsupported versions, or out-of-bounds stored payloads are treated as a storage/read failure: the server does not show partial recap content, leaves visibility unchanged/hidden, records safe diagnostics, and returns the mapped service error.
- A malformed recap row does not cause fallback recomputation or overwrite because that would violate snapshot immutability. Recovery uses the user's existing database backup or a future explicit repair tool, not automatic deletion.
- Foreign-key and integrity-check behavior follows the existing store. Missing referenced sessions or migration failure prevents authoritative capture rather than creating orphaned state.
- There is no per-session cleanup, retention window, delete button, or cache eviction in this change. Growth is bounded to existing aggregate/fact rows plus one small recap row per captured session; full chat remains unstored.
- Uninstall/data removal follows current application behavior. Runtime visibility disappears immediately with the process and needs no cleanup.

## Verification

- Assert migration schema, foreign keys, unique constraint, JSON validity, indexes, conservative backfill, down migration, and existing-row preservation in store migration tests.
- Assert live command/award/activity/contract events and causal achievement unlocks receive the correct session atomically; reconciliation and ambiguous legacy rows remain null.
- Assert viewer merges preserve event/unlock attribution and collision winners retain the earliest row's nullable session id.
- Assert concurrent Show/StartSession and duplicate Show cases yield one immutable snapshot, exact repeated payload bytes/DTO, and no mixed-session totals under `go test -race`.
- Assert config omission, explicit zero, valid boundaries, invalid values, unknown keys, and load/save no-rewrite behavior.
- Run `go test ./...`, targeted `go test -race` for store/API/controller packages, `golangci-lint run ./...`, and `PRAGMA foreign_key_check`/migration integrity assertions in tests.

## Not applicable

New preference files, credential/keychain records, encryption keys, media caches, full-chat archives, temporary export files, cleanup jobs, retention settings, remote backup, and cloud synchronization are not part of this change.
