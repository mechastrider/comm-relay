# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite | Progression level / Store | Existing local database | Add emblem column | Public display metadata |
| Config | Overlay preset / config.Store | Existing config.json | Optional boolean switches | Display preferences |

## Changed Structures / Formats

Migration 00023 adds `emblem` TEXT NOT NULL DEFAULT 'shield' with a finite allowlist. Backfill starter ids to chevron_1, chevron_2, chevron_3, star, laurel. Fresh starter insertion must set the same choices because bootstrap runs after migrations. Omitted emblem in existing update clients preserves the current selection.

Optional preset fields: surfaces.chat.show_level_badges, surfaces.chat.show_command_ammo, surfaces.leaderboard.show_level_badges. Missing/null means enabled; explicit false persists. Clone pointers independently.

## Atomicity / Concurrency / Locking

Existing Goose migration transaction, store mutex and config atomic save. Quotas are derived from existing interaction facts, never written by presentation reads.

## Encryption / Secret Storage / Privacy

No secrets or new encryption requirements.

## Migration / Downgrade / Backup / Export

Append-only migration with down column removal. Existing backup/export includes the column. Restoring the pre-upgrade database remains the safe binary rollback; UI can be disabled without rolling back. Never reseed missing operator-deleted levels.

## Corruption Recovery / Cleanup / Uninstall

Existing storage error handling remains authoritative. Missing snapshot data omits decorations. No cache directory or uninstall changes.

## Verification

Test migration from v22, fresh bootstrap, edited starter and custom levels, omitted emblem preservation, allowlist rejection, and config missing/false round trips.
