# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| Browser storage | No new Studio debug state | Browser/Wails webview profile unchanged | No new key or schema | Unchanged |
| Server memory | One global debug client audience, active run ID/generation, timers, and cancellation state | Process-local only | Runtime structures, never serialized | Low; may temporarily contain operator-entered synthetic text |
| Existing config/database/history stores | No new debug data | Existing locations unchanged | Existing schemas unchanged | Unchanged |

## Changed Structures / Formats

No persistent structure, browser-storage key, or file format changes. Scenario inputs, receiver counts, emitted frames, and pending runs are not persisted. Existing `config.json`, chat history, award/viewer data, analytics, and any SQLite schema remain unchanged. Dedicated test URLs are stable because they do not contain a generated identifier; snapshot appearance overrides live only in the copied URL.

## Atomicity / Concurrency / Locking

Not applicable to durable state. In memory, the process accepts at most one active test run. Every Fire or Reset atomically advances the global run generation and cancels the prior timer context; Fire also enqueues `debug_reset` before its immediate frames. Each delayed step rechecks the generation immediately before send so stale work cannot publish. WebSocket client membership follows the hub's existing synchronization and non-blocking fan-out rules.

## Encryption / Secret Storage / Privacy

No secret, debug identifier, or credential is created or stored. Synthetic scenario text remains in browser and server memory for the active interaction and MUST NOT be logged as request content or written to product stores.

## Migration / Downgrade / Backup / Export

No migration, downgrade transform, backup, or export is required. Older builds return 404 for the dedicated test page and debug WebSocket paths while all production paths continue unchanged. Removing the feature leaves no browser or server data to clean up.

## Corruption Recovery / Cleanup / Uninstall

Reset clears transient surface state and cancels the global run; process shutdown clears all server state. Reconnecting a stable test URL after restart starts empty and receives no replay. Normal uninstall is sufficient cleanup.

## Verification

- Assert that scenario fire/reset calls leave config bytes and product repositories unchanged.
- Assert that restart begins with no debug clients, runs, timers, or replayable frames.
- Assert that reset/new-run concurrency prevents delivery from an older generation.
- Assert that the stable test URLs require no browser-stored identifier and remain identical across restarts.

## Not applicable

Database migrations, new files/directories, atomic file replacement, file locking, encryption at rest, keychain/credential manager use, backup/export format, and durable corruption recovery do not apply because this change adds no persistent product state.
