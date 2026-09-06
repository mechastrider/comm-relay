# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | Operator-owned global visibility policy and trigger timing | Existing config location | Additive `leaderboard_visibility` object | Non-secret operational settings |
| SQLite `commands` | Operator-owned command action | Existing `comm-relay.db` beside config | Additive non-null `action` text column | Existing viewer interaction configuration |
| Process memory | Current hidden/timed/pinned state, deadline, cooldown, dirty flag, delayed award | Not portable or backed up | Ephemeral controller state | Non-sensitive |
| Browser/WebView | Dock rendering of last state/countdown | Existing page memory only | Not persisted | Non-sensitive |

## Changed Structures / Formats

Config adds:

```json
{
  "leaderboard_visibility": {
    "policy": "automatic",
    "display_seconds": 15,
    "cooldown_seconds": 300,
    "dirty_interval_seconds": 900,
    "show_on_award": true,
    "show_on_rank_change": true
  }
}
```

SQLite migration `00013_commands_action.sql` adds `commands.action TEXT NOT NULL DEFAULT 'alert'`. Application validation accepts only `alert` and `show_leaderboard`. Existing presentation columns remain populated but are ignored for show-leaderboard actions.

## Atomicity / Concurrency / Locking

Visibility config uses the existing validated atomic config save. Command create/update continues under the store lock and writes action with the rest of the row. The controller owns runtime state on one goroutine; HTTP, XP, award, and command callers submit bounded messages instead of mutating it directly. Persistence never waits for an OBS client acknowledgement.

## Encryption / Secret Storage / Privacy

No secret is added. Visibility frames and runtime state contain enums, timestamps, and reasons only. Interaction events continue to omit chat text. Existing config secret redaction and SQLite access permissions remain.

## Migration / Downgrade / Backup / Export

- Add migration 00013; never edit or renumber 00001–00012.
- Up adds the column with default `alert`, preserving every existing command.
- Down drops only the `action` column using the same Goose/SQLite pattern as current additive migrations.
- New config files write automatic defaults. Loading an existing file with the object absent resolves `always`; a presence check distinguishes upgrade from a newly generated file.
- Older binaries ignore `leaderboard_visibility` and the SQLite column, treating all commands as alerts. Downgrading therefore disables show-leaderboard actions rather than converting them into valid splash commands; document backup before downgrade.
- Existing config/database backup and export naturally include the new state; ephemeral runtime overrides are intentionally excluded.

## Corruption Recovery / Cleanup / Uninstall

Unknown command actions or invalid visibility fields fail closed through validation and do not partially save. A migration failure aborts startup with the existing database error path; the prior database remains the recovery source. No new asset or cache cleanup is needed. Runtime state disappears on normal or crash restart and is reconstructed from policy.

## Verification

- Apply migrations from a database at version 12 and verify every command reads `action=alert`.
- Exercise migration down/up in a scratch database and confirm row preservation.
- Test fresh-config automatic defaults versus legacy-config always fallback.
- Round-trip both command actions through store and API tests.
- Run the existing migration ordering/duplicate-prefix checks if present.

## Not applicable

No new database/table, secret encryption, media file, avatar cache, cloud sync, retention policy, or remote export is introduced.
