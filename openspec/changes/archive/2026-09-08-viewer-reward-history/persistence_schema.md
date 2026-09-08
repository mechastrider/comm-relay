# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite database | Viewer identities, XP, catalogs, and interaction events; owned by `internal/store` | `comm-relay.db` beside `config.json`; follows existing portable/user-data location | Goose-managed SQLite; `interaction_events` gains one nullable column and two indexes | Local community identity and contribution history; no chat text or secrets |
| Operator config | Existing settings and credentials | `config.json` beside the database | Unchanged JSON | May contain connector secrets; not read by history except existing locale/custom-avatar settings |
| Browser/WebView preferences | Existing UI state | `localStorage` | Unchanged | Non-secret |
| Overlay assets/avatar cache | Existing media | Existing overlay-assets directory | Unchanged | Local media and cached remote portraits; not copied into history |

## Changed Structures / Formats

Create the next immutable migration (currently expected as `00014_reward_history.sql`; use the next free number at implementation time):

```sql
ALTER TABLE interaction_events ADD COLUMN reward_name TEXT NULL;

-- Rewrite every application-produced UTC RFC3339/RFC3339Nano value to
-- YYYY-MM-DDTHH:MM:SS.nnnnnnnnnZ before relying on indexed text order.
UPDATE interaction_events
SET created_at = CASE
    WHEN substr(created_at, 20, 1) = 'Z'
        THEN substr(created_at, 1, 19) || '.000000000Z'
    ELSE substr(created_at, 1, 20) ||
        substr(substr(created_at, 21, length(created_at) - 21) || '000000000', 1, 9) ||
        'Z'
END
WHERE substr(created_at, -1, 1) = 'Z'
  AND substr(created_at, 20, 1) IN ('Z', '.');

UPDATE interaction_events
SET reward_name = COALESCE(
    NULLIF((SELECT name FROM award_types WHERE award_types.id = interaction_events.award_id), ''),
    award_id
)
WHERE kind = 'award';

CREATE INDEX idx_interaction_events_reward_history
ON interaction_events(kind, created_at DESC, id DESC);

CREATE INDEX idx_interaction_events_viewer_reward_history
ON interaction_events(viewer_id, kind, created_at DESC, id DESC);
```

The normalization covers the application-produced UTC forms: exact seconds and fractional seconds from one through nine digits. It preserves the represented instant while right-padding the fractional component to nine digits. Normal award rows already require a non-empty `award_id`, so the backfill produces a non-empty name from the current catalog or that stable id. Command and activity rows retain `NULL`. New interaction-event inserts MUST write `created_at` in the same fixed-width UTC form; new award-event inserts MUST also supply a trimmed non-empty `reward_name`, and store validation rejects an empty value. Existing `award_id`, points, source-message reference, timestamp value, and viewer foreign key remain unchanged.

The migration also installs `trg_interaction_events_reward_history_compat`, an `AFTER INSERT` trigger. It preserves the schema-14 downgrade-without-Down contract: a previous binary can use its legacy column list against the additive schema, and the trigger canonicalizes the inserted application UTC timestamp and fills an omitted or blank award snapshot from the current catalog name or non-empty `award_id`. It does not change the current writer's values.

The API read model is derived, not a new table. It selects award events and the surviving viewer's current display name. Cursor state is not persisted; it base64url-encodes a versioned JSON tuple containing `created_at` and event `id`.

## Atomicity / Concurrency / Locking

- The HTTP award path uses one store transaction for identity upsert, all-time/session/day XP, rank comparison, and interaction-event insert.
- Any failure rolls the transaction back. Alert broadcast, diagnostics, visibility scheduling, and leaderboard publication happen only after commit.
- Existing store mutex ownership remains unchanged and covers both the transaction and bounded history queries.
- Page reads request `limit + 1` rows, capped at 101, to derive `next_cursor`; no unbounded in-memory event list is built.
- Keyset predicates and order are `(created_at DESC, id DESC)` over the canonical fixed-width timestamp text. Both cursor components are bound parameters.
- Viewer merge continues rewriting `interaction_events.viewer_id` in its existing transaction, so history moves atomically to the survivor.

## Encryption / Secret Storage / Privacy

No new encryption or secret store is introduced. The database already contains viewer identities and counters; `reward_name` adds operator-authored catalog text only. It MUST NOT receive splash templates, transient quotes, chat text, platform user ids, OAuth data, proxy credentials, or filesystem paths. The API omits stored source-message ids even though those columns remain available for existing alert/highlight behavior.

## Migration / Downgrade / Backup / Export

- Add a new migration; never edit or renumber `00001`–`00013`.
- Goose executes the column addition, backfill, and indexes before HTTP serving. A failure leaves startup failed under the existing local-runtime contract rather than serving a mixed schema.
- The Down migration drops the compatibility trigger before both new indexes and `reward_name`. SQLite column-drop syntax already used by project migrations is acceptable for the supported runtime. It intentionally leaves `created_at` in its semantically equivalent fixed-width spelling because the original fractional width is not meaningful data and previous binaries parse the canonical form.
- A previous binary ignores the additional column and indexes; while schema 14 remains installed, its legacy inserts are repaired by the compatibility trigger. If downgraded after Down, award ids/points and all XP remain; only the new name snapshots are discarded.
- Existing user backup practice for the configuration directory automatically includes the new column. This change adds no dedicated backup, import, export, or cloud synchronization.

## Corruption Recovery / Cleanup / Uninstall

Existing database-open and migration errors remain fatal before HTTP startup and must be logged without sensitive values. History has no deletion or retention policy; rows follow the current durable interaction-event lifecycle. Uninstall and manual data-directory removal remain existing operator actions. There is no cache to rebuild and no orphan media cleanup.

## Verification

- Migration test from schema version 13 verifies current catalog names are copied, deleted catalog references fall back to `award_id`, and exact-second plus mixed one-to-nine-digit fractional timestamps normalize without changing their parsed instants. A downgrade-without-Down regression writes a legacy-column-list award after schema 14, reopens through the current store, and proves naming and keyset page ordering remain correct.
- Fresh-database test verifies the final schema, both indexes, and null `reward_name` on non-award events.
- Down/up migration test verifies earlier event fields and XP survive rollback/reapply.
- Store tests inject event-insert failure and verify XP/session/day counters and event count remain unchanged.
- Query tests cover global/viewer index-compatible ordering, exact seconds, mixed legacy fractional widths, equal normalized timestamps, page boundaries, merge rewrite, and absence of command/activity rows.

## Not applicable

No `config.json` field, schema encryption, keychain/credential-store change, asset format, filesystem relocation, browser preference, temporary file, or remote data store is introduced.
