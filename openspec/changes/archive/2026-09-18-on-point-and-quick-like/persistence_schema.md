# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite `award_types` | Operator award catalog including seed `on_point` | Existing `comm-relay.db` beside config | Existing columns; no new fields | Operator-authored names and splash text |
| SQLite `achievement_definitions` / `achievement_revisions` | Seed `achievement_on_point` | Same database | Existing tables; metric award-count, subject `on_point`, target 10, not repeatable | Same as other achievements |
| SQLite `store_bootstrap` | One-time on-point catalog marker | Same database | New key, same table as `starter_catalog_initialized` / `social_catalog_initialized` | Not sensitive |
| `config.json` | Unchanged | Existing config path | No new keys | N/A |
| Browser memory | Awards list cache for Like visibility | Process-local page | Existing `GET /api/awards` JSON | Award ids and names |

Do not add a second database. Do not migrate config into SQLite.

## Changed Structures / Formats

No Goose table migration is required. Next unused Goose number remains available for unrelated work.

### Bootstrap key

Use a dedicated `store_bootstrap` key (for example `on_point_catalog_initialized`). Values follow existing catalog markers: pending locale prefix during the insert, then `1`. Empty/absent on an upgraded database means “run insert-if-absent,” not “adopt and skip” (unlike social-catalog empty adoption).

### Award row `on_point`

`INSERT … WHERE NOT EXISTS (id = 'on_point')` with locale-specific name/splash, `points` 20, `sound` `ping`, `duration_ms` 5000. Do not `UPDATE` an existing row. After the marker is `1`, a missing row means the operator deleted it — do not insert again.

### Achievement row `achievement_on_point`

Insert definition + revision 1 with `ON CONFLICT DO NOTHING` in the same transaction as the award seed. Subject id `on_point`, subject label the locale award name, target 10, `repeatable` 0, `enabled` 1, `secret` 0, `announce` 1. If `on_point` is absent (operator-owned collision or delayed award), still insert the achievement.

### Fresh starter catalog

`starterAwardsForLocale` includes `on_point` so a brand-new file has ten seeds. On-point bootstrap then no-ops the award insert.

## Atomicity / Concurrency / Locking

Award insert, achievement insert, and marker write happen in one transaction under the existing store mutex at open. Grant of `on_point` uses the current award-grant transaction (XP, event, progression). Two admin clients racing open MUST not create duplicate ids (`WHERE NOT EXISTS` / `ON CONFLICT`).

## Encryption / Secret Storage / Privacy

No new secrets. Splash templates are operator text. Grants still do not persist message quotes.

## Migration / Downgrade / Backup / Export

Replace the binary; first open completes bootstrap. Backup remains copy of the SQLite file. Downgrade: older binaries ignore unknown award/achievement ids; rows remain. No installer rollback script. No Goose Down.

## Corruption Recovery / Cleanup / Uninstall

Failed bootstrap rolls back the transaction and prevents startup. Uninstall is still deleting the data directory. Orphan achievement with deleted `on_point` keeps its snapshot label and stops gaining progress (existing achievement-subject rule).

## Verification

Store tests: fresh DB has `on_point` + `achievement_on_point`; already-initialized DB without those ids gains them once; existing custom `on_point` row unchanged; delete then restart does not recreate; tenth grant unlocks Sync without extra XP; locale ru-RU vs en-GB names.

## Not applicable

Encrypted at-rest DB, export/sync, new Goose tables, moving config into SQLite, session-file caches.
