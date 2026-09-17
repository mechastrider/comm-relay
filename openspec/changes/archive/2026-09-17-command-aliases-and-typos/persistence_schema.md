# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite `commands` | Canonical command catalog | Existing `comm-relay.db` beside config | Unchanged columns; `trigger` UNIQUE remains | Operator-authored slugs and splash text |
| SQLite `command_aliases` | Extra slugs per command | Same database | Goose `00020`; `alias` UNIQUE; FK to `commands(id)` ON DELETE CASCADE | Same as triggers; no chat bodies |
| `config.json` | Unchanged | Existing config path | No new keys | N/A |
| Process memory | Matcher cooldown and outcomes | Process-local | Existing maps keyed by command id | Not durable |
| Pack YAML | Optional `aliases` on command specs | Operator pack directory | Additive YAML list | Operator-authored slugs |

## Changed Structures / Formats

### SQLite migration `00020_command_aliases.sql`

Next immutable migration after `00019_stream_recaps.sql`:

```sql
CREATE TABLE command_aliases (
    command_id TEXT NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (command_id, alias)
);

CREATE UNIQUE INDEX idx_command_aliases_alias ON command_aliases(alias);
```

No backfill: existing catalogs have zero aliases. Application code MUST still reject an alias that equals any `commands.trigger` (including other rows); SQLite cannot UNIQUE across two tables. Slug charset and the 16-alias cap are enforced in Go, not CHECK, matching `validateCommandTrigger`.

Down: `DROP TABLE command_aliases`. Command rows unchanged.

### HTTP / store mapping

`Command.Aliases` is a `[]string` loaded with the command. Create/update replace the alias set in the same store mutex/transaction as the command row. Delete command cascades aliases.

### Pack YAML

`commands[].aliases` is an optional sequence of slugs. Omission means none. Apply uses the same uniqueness rules as HTTP.

## Atomicity / Concurrency / Locking

Replace aliases inside the existing store mutex: delete old aliases for that id, insert the new set, then return the scanned command. Unique-constraint failures map to `ErrDuplicateTrigger` or a dedicated aliases sentinel that the HTTP layer turns into field `aliases`. Concurrent admin saves serialize on the store mutex as today.

## Encryption / Secret Storage / Privacy

No secrets. Aliases are public-facing chat names. Do not encrypt. Do not log full chat lines at Info.

## Migration / Downgrade / Backup / Export

Upgrade: Goose Up creates an empty table; matching behavior is unchanged until aliases are saved. Backup remains “copy the data directory.” Downgrade: older binaries ignore `command_aliases` and match exact `commands.trigger` only; alias rows survive until a later Up. Export/pack-import is the YAML path above, not a new dump format.

## Corruption Recovery / Cleanup / Uninstall

Orphan aliases cannot exist after CASCADE delete. Duplicate alias insert is a 400, not a repair tool. Uninstall/data-dir delete removes the table with the database.

## Verification

- Migration test: UpTo 19 → Up 20 → empty aliases on seed `gg`/`hi` → Down to 19 drops the table → Up 20 again.
- Store tests: alias round-trip, cascade delete, trigger vs alias collision, alias vs alias collision, cap 16, omitted aliases.

## Not applicable

`config.json`, overlay assets, cooldown persistence, encryption, new backup tooling.
