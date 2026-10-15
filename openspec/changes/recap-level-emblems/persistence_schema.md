# Persistence Schema
## State Inventory
SQLite stream_recaps.payload_json owns immutable public version-1 snapshots at the existing data location.
## Changed Structures / Formats
Ranking rows gain optional string `emblem`: shield, chevron_1, chevron_2, chevron_3, star, laurel. Empty/absent is valid for legacy data.
## Atomicity / Concurrency / Locking
Capture uses the existing transaction and level resolution query; no additional reads outside the transaction.
## Encryption / Secret Storage / Privacy
Public level metadata only; no secrets.
## Migration / Downgrade / Backup / Export
No migration/backfill. Older readers ignore new field; backups retain JSON. PNG embeds shared SVG styles.
## Corruption Recovery / Cleanup / Uninstall
Existing snapshot validation and recovery apply; invalid nonempty stored emblems are rejected.
## Verification
Round-trip new and legacy snapshots; capture then change XP/level configuration and assert historical title/emblem remain unchanged. Verify current all-time results update.
