# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite | Level catalog, achievement definitions/revisions, unlock history, progression alert settings, reconciliation state, viewer opt-out; `internal/store` | Existing database beside `config.json` in the resolved application-data directory | Additive Goose migration after `00016_viewer_greetings.sql` | Viewer identities linked to participation history; local personal data |
| SQLite existing tables | All-time/session/day counters, interaction events, contracts, commands, awards, stream sessions | Same existing database | Existing schema plus indexes needed by progression and corrected merge operations | Existing local viewer activity data |
| `config.json` | Per-overlay-preset `surfaces.leaderboard.show_viewer_titles`; config store | Existing portable config location and atomic write path | Optional boolean, omitted resolves false | Not sensitive |
| Browser/webview preferences | Active Audience progression section and existing navigation/density preferences where appropriate | Existing per-browser profile storage | Version-tolerant strings | Not sensitive |

Progression does not move operator configuration into SQLite, add files, or create a second database.

## Changed Structures / Formats

Names below define the intended relational contract; implementation may adjust SQL spelling only if keys, constraints, and behavior remain equivalent.

### `progression_levels`

| Column | Contract |
|--------|----------|
| `id TEXT PRIMARY KEY` | Generated stable id; seeded ids are stable across locales |
| `title TEXT NOT NULL` | Trimmed, 1–64 Unicode code points |
| `min_xp INTEGER NOT NULL UNIQUE` | 0–1,000,000,000; exactly one row is protected at zero |
| `announce INTEGER NOT NULL` | Boolean check |
| `created_at`, `updated_at TEXT NOT NULL` | Canonical UTC RFC3339 timestamps |

Current viewer level is queried from all-time `viewers.xp`; no `level_id` is stored on viewers.

### `achievement_definitions`

| Column | Contract |
|--------|----------|
| `id TEXT PRIMARY KEY` | Generated stable id or stable seed id |
| `name TEXT NOT NULL` | Trimmed, 1–64 code points |
| `description TEXT NOT NULL DEFAULT ''` | At most 240 code points |
| `enabled`, `secret`, `announce INTEGER NOT NULL` | Boolean checks |
| `active_revision INTEGER NOT NULL` | Positive revision owned by this definition |
| `deleted_at TEXT NULL` | Soft delete preserves unlock/revision meaning and prevents evaluation/listing |
| `created_at`, `updated_at TEXT NOT NULL` | Canonical UTC RFC3339 timestamps |

Limit active definitions to 200 per installation. Deleted definitions do not count toward the limit and are not restored by seed bootstrap.

### `achievement_revisions`

| Column | Contract |
|--------|----------|
| `achievement_id TEXT`, `revision INTEGER` | Composite primary key; revision is positive and monotonic per definition |
| `metric TEXT NOT NULL` | Check allowlist: `message_count`, `xp`, `award_count`, `command_count`, `session_count`, `contract_win_count` |
| `subject_id TEXT NULL` | Required only for award/command metrics; intentionally no catalog foreign key so deletion remains readable |
| `subject_label TEXT NOT NULL DEFAULT ''` | Display snapshot captured when saving the revision |
| `target INTEGER NOT NULL` | 1–1,000,000,000 |
| `repeatable INTEGER NOT NULL` | Boolean check |
| `created_at TEXT NOT NULL` | Canonical UTC RFC3339 |

`achievement_definitions(active_revision)` and revision existence are validated in one transaction. Presentation-only edits update the definition and do not insert a revision.

### `viewer_achievement_unlocks`

| Column | Contract |
|--------|----------|
| `id TEXT PRIMARY KEY` | Generated event id |
| `viewer_id TEXT NOT NULL` | Foreign key to canonical viewer |
| `achievement_id TEXT NOT NULL`, `revision INTEGER NOT NULL` | Foreign key to immutable revision |
| `occurrence INTEGER NOT NULL` | Positive; unique with viewer, achievement, revision |
| `progress_value INTEGER NOT NULL` | Metric value observed at unlock |
| `name TEXT NOT NULL`, `description TEXT NOT NULL` | Display snapshots so later edits/deletion do not rewrite history |
| `backfilled INTEGER NOT NULL` | Boolean; true for startup, upgrade, edit, merge, or manual reconciliation |
| `unlocked_at TEXT NOT NULL` | Canonical UTC RFC3339; live uses cause time, backfill uses reconciliation time when no exact fact boundary can be recovered |

Indexes SHALL support viewer history ordered by `unlocked_at DESC, id DESC`, uniqueness lookup, and definition/revision reconciliation.

### `progression_alert_settings`

A singleton row stores `achievement_enabled`, `level_enabled`, `layout`, `sound`, `sound_volume`, `duration_ms`, and timestamps. Both enable flags default false; presentation defaults follow the existing safe alert defaults (`card`, silence, volume 70, 5000 ms). Checks match the existing alert presentation allowlists and bounds. It stores built-in sound or silence only; no asset filename is added. Missing singleton state resolves to these defaults and is created by progression bootstrap.

### `progression_reconciliation`

A singleton/keyed state row records bootstrap state (`pending:<locale>` or `complete`), requested generation, completed generation, status, optional last processed viewer id, and timestamps. It contains no user-facing error detail or secret. A generation change invalidates only the checkpoint, never unlock history.

### Existing-table changes

- Add `viewers.progression_alerts_disabled INTEGER NOT NULL DEFAULT 0` with a boolean check.
- Add nullable `interaction_events.command_id TEXT` for the stable id of each successful command at execution time. Keep `command_trigger` as the immutable historical display snapshot; do not add a catalog foreign key, so deleted commands remain understandable.
- Add indexes for award/command counts by `(viewer_id, kind, award_id/command_id)` and contract wins by winner/status only after query-plan verification.
- Do not duplicate all-time message/XP counters or session participation aggregates.
- Update merge queries to iterate every `viewer_session_stats` and `viewer_day_stats` key, using upsert-add semantics before deleting source rows. Reassign `interaction_events`, contracts where applicable, and unlocks in the same transaction.

### `config.json`

Add optional `overlay.presets[].surfaces.leaderboard.show_viewer_titles`. Load resolves omission to false. Save validates boolean input and follows the existing temporary-file, fsync/rename atomic path. Progression alert settings do not enter `config.json`.

## Atomicity / Concurrency / Locking

- Catalog mutations, revision creation, and reconciliation-generation requests commit in one SQLite transaction.
- A fact-producing live operation and insertion of its affected unlock rows share one serialized store transaction. The transaction returns an in-memory result bundle; WebSocket publication occurs only after commit.
- `UNIQUE(viewer_id, achievement_id, revision, occurrence)` is the final duplicate guard across concurrent evaluation, event retry, restart, and backfill.
- Reconciliation uses bounded deterministic viewer-id batches. Each batch commits its unlock inserts and checkpoint atomically. Normal live writes may proceed between batches.
- A viewer merge upserts all overlapping period rows, reassigns non-overlapping rows/facts, resolves unlock collisions by keeping one occurrence with the earliest `unlocked_at`, combines opt-outs with logical OR, records the audit, and hides the source in one transaction.
- Foreign keys remain enabled. Busy/locked failures follow existing retry/error handling and never cause an alert from uncommitted state.

## Encryption / Secret Storage / Privacy

No secret or credential is added. SQLite retains the project's existing at-rest policy; this change does not claim encryption. Achievement names, snapshots, viewer ids, XP, progress values, and timestamps are local personal/activity data and follow the database's existing access and backup boundary. API/logging must not expose filesystem paths, OAuth tokens, raw chat bodies, or locked secret-definition details.

## Migration / Downgrade / Backup / Export

1. An additive Goose migration creates tables, constraints, indexes, singleton state, and the viewer boolean with default false. A subsequent additive migration adds nullable `interaction_events.command_id` and backfills only a legacy row whose saved `command_trigger` resolves to exactly one current command. It leaves ambiguous or deleted-command rows unchanged; the migration is idempotent and never deletes interaction history.
2. On first progression bootstrap, persist `pending:<normalized locale>` before inserting localized seeds so a crash cannot change language on retry. Use a progression-specific key/state, independent of existing command/award bootstrap.
3. For databases with no progression metadata, insert every stable seed with conflict-safe semantics, mark bootstrap complete, increment reconciliation generation, and run silent backfill. Existing award/command subjects that were deleted remain valid seed references with saved labels but cannot gain progress until rebound.
4. Existing databases and fresh databases follow the same one-time catalog contract. A completed marker prevents retranslation/restoration after user edits or deletion.

Backups continue to consist of the existing `config.json`, SQLite database, and overlay asset directory. Any existing export/import or copied-data workflow includes progression automatically because it copies the database; no new export format is introduced.

Older binaries ignore additive tables and the viewer column because their named-column writes remain compatible. The optional config key is tolerated by the current config decoder/preservation strategy and defaults false when absent. Before implementation sign-off, a copied populated database MUST be opened by the selected previous release and then reopened by the new build. Rollback never drops progression tables or rewrites historical counters.

## Corruption Recovery / Cleanup / Uninstall

SQLite corruption and application-data removal follow existing recovery guidance. The app MUST NOT silently delete/reseed a user-owned catalog to recover a malformed row; migration/bootstrap/reconciliation errors are surfaced through logs/diagnostics and retried only when safe. Deleting an achievement soft-deletes its definition and retains revisions/unlocks. No periodic pruning of unlocks or revisions occurs. Uninstall behavior is unchanged and does not introduce an independent cache to clean.

## Verification

- Migrate fresh, version-16, and representative populated databases; verify foreign keys, `PRAGMA integrity_check`, durable command ids for new executions, and safe no-op treatment of unresolved legacy command events.
- Crash/restart at pending-locale, mid-seed, and mid-reconciliation checkpoints; verify stable language, no duplicate seeds/unlocks, and no alerts.
- Exercise concurrent live evaluation and reconciliation under `go test -race`; assert one occurrence per unique key and post-commit publication.
- Merge viewers with overlapping/non-overlapping historical sessions, days, interactions, contracts, opt-outs, and unlocks; verify sums, earliest collision timestamps, audit, and rollback injection.
- Verify query plans/index use on large synthetic viewer/event histories and that admin reads remain bounded.
- Round-trip legacy/current `config.json` with omitted/false/true `show_viewer_titles`; verify unrelated fields and secrets are preserved.
- Perform copied-data downgrade/forward smoke with the selected previous release; retain backup before destructive manual testing.

## Not applicable

No new secret store, encryption key, file permission, uploaded asset type, cache directory, cloud database, network persistence, registry/plist setting, or browser database is introduced.
