# Persistence Schema
## State Inventory
SQLite beside config: existing interaction_events and viewer_achievement_unlocks; new viewer_level_events. No new files or preferences.
## Changed Structures / Formats
Migration 00026: interaction actor_viewer_id nullable and feed_hidden default false; indexed viewer_level_events with stable id, session, viewer, level title snapshot and timestamp. Existing data is not reinterpreted. Reuse the existing live achievement session/time index.
## Atomicity / Concurrency / Locking
Metadata and level transitions commit in the same transaction as XP/facts. Store mutex protects reads and writes. Merge repoints actors and level viewers without moving sessions.
## Encryption / Secret Storage / Privacy
No new secrets or chat content. Names resolved from current viewer identities; action/level names remain snapshots.
## Migration / Downgrade / Backup / Export
Additive up migration; down removes only new fields/table/index. Old writers use defaults (generic legacy feed rows). Backup normal SQLite before downgrade. No new export.
## Corruption Recovery / Cleanup / Uninstall
Existing database backup/reset lifecycle remains authoritative. Query failure returns a logged error and retry UI; no silent recovery/reseeding.
## Verification
Store tests: legacy defaults, social dedup despite catalog edit, level durability, rollback, merge, session isolation and cursor pagination.
