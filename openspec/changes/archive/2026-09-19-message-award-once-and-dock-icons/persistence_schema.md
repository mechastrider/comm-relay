# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite `interaction_events` | Durable award (and other) events | Existing `comm-relay.db` beside config | Existing columns: `kind`, `award_id`, `message_platform`, `message_id` | Award ids and source message ids; no chat text |
| In-memory recent messages | Live/dock snapshot | Process RAM | JSON `granted_award_ids` derived at read time | Same ids |
| `config.json` | Unchanged | Existing config path | No new keys | N/A |
| Browser memory | Row granted-id set until reload | Page session | Derived from recent GET + local grants | Award ids |

Do not add a second database. Do not migrate config into SQLite.

## Changed Structures / Formats

No Goose migration. No new tables, columns, or UNIQUE index.

Uniqueness is a query inside `GrantAward` when `message_id` is non-empty:

```sql
SELECT 1 FROM interaction_events
 WHERE kind = 'award'
   AND message_platform = ?
   AND message_id = ?
   AND award_id = ?
 LIMIT 1
```

`granted_award_ids` is the distinct `award_id` list for `kind = 'award'` matching that platform and message id, ordered by `created_at`, then event id. Buff and command rows are excluded.

Historical duplicate rows (same triple already present) stay as-is. New grants of that triple return conflict; extra historical events are not deleted.

## Atomicity / Concurrency / Locking

The existence check, XP update, and event append run in the existing grant transaction under the store mutex. Two concurrent grants of the same triple: one commits, one conflicts. A failed append still rolls back XP.

## Encryption / Secret Storage / Privacy

No new secrets. Message quotes remain transient and unpersisted.

## Migration / Downgrade / Backup / Export

Replace the binary. Backup remains a copy of the SQLite file. Downgrade: older binaries ignore uniqueness and `granted_award_ids`. No installer rollback script. No Goose Down.

## Corruption Recovery / Cleanup / Uninstall

Uninstall is still deleting the data directory. No cleanup of historical duplicate awards.

## Verification

Store tests: Joke then Advice on one message id succeeds twice; second Joke conflicts with no extra XP; missing message id allows repeats; recent-message assembly returns `["like"]` after a like grant and omits the field when none.

## Not applicable

Encrypted at-rest DB, export/sync, new Goose tables, moving config into SQLite, session-file caches.
