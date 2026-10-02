# Persistence Schema
## State Inventory
Existing local SQLite owns viewer identities and progression; paths and ownership are unchanged.
## Changed Structures / Formats
Migration 00022 creates non-unique `idx_viewer_identities_viewer_last_seen` on `(viewer_id, last_seen_at DESC)`. No columns, payload formats or catalog rows change. Measured query plans previously scanned identities and sorted for every correlated lookup.
## Atomicity / Concurrency / Locking
Existing Goose migration transaction at startup. No new concurrent writers or lock policy.
## Encryption / Secret Storage / Privacy
Unchanged; no secret or content copies.
## Migration / Downgrade / Backup / Export
Append-only migration after 00021; CREATE INDEX IF NOT EXISTS, reversible DROP INDEX IF EXISTS. Existing rows need no backfill or constraints. Down preserves every data row. No backup/export format changes. A prior migration runner may need downgrade to 00021 before old-binary startup; SQL writes remain compatible.
## Corruption Recovery / Cleanup / Uninstall
Existing behavior unchanged. Index creation failure follows startup migration error handling.
## Verification
Go test migrates a populated v21 fixture up/down/up, asserts lookup uses the index, and verifies the viewer name and linked identities are untouched. Existing full store/handler tests cover fresh initialization and API compatibility. Subject selects preserve IDs and Settings uses existing APIs.
