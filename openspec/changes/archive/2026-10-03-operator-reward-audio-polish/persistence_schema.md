# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| Existing config.json | Operator preferences / Go config store | Existing configured data location | Add `admin.command_sound_enabled: boolean` | Non-sensitive |

## Changed Structures / Formats

Missing field resolves to true on new install and disk load. Explicit false remains false. Config update omission preserves the current value, including requests from older clients. Public config returns the resolved boolean. React config types, settings field mapping, normalization, and serialization must carry the field.

## Atomicity / Concurrency / Locking

Retain existing config store locking, atomic saving, and latest-config merge flow; add no independent preference writer.

## Encryption / Secret Storage / Privacy

No secrets or new encryption needs. Do not log command audio contents or paths.

## Migration / Downgrade / Backup / Export

No versioned migration or SQLite change. Existing backups contain the preference after save. Older binaries can ignore it; an older binary rewriting config can remove it, and a subsequent upgrade defaults to true.

## Corruption Recovery / Cleanup / Uninstall

Existing config parse errors and recovery apply. No generated files or cleanup requirements.

## Verification

Test fresh defaults, a pre-change admin config, explicit true/false round trips, unrelated updates, and omitted-field requests. Check public API projection and frontend form save payload.
