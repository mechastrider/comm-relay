# Persistence Schema

## Not applicable

No durable store changes. All-time status is computed on read/show from existing `viewers` and all-time leaderboard queries. Session recap snapshots remain the existing `stream_recaps` rows with unchanged schema and uniqueness. Share PNGs are not written into the application data directory; they are one-off browser downloads. `config.json` gains no keys. Runtime `window` and last all-time presentation live only in the recap controller and are discarded on process exit.

Existing inventory (`comm-relay.db`, `config.json`, in-memory recap visibility) is unchanged in format, path, encryption, migration, backup, and downgrade behavior. Older binaries ignore additive JSON fields. Reverting the application binary is sufficient rollback.
