# Persistence Schema

## Not applicable
No database, config, secret, media storage, or local preference format changes. Preserve existing keys and defaults. Settings section saves merge into fresh server config; Studio draft publication remains independent. Existing downgrade behavior is unchanged.

## Verification
Use synthetic config/SQLite/media and browser storage. Verify saved edits after reload and server restart; verify pre-existing preference keys and graceful storage failure. Never run data:sync or seed against user data for regression.
