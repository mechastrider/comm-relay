# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | Operator settings, connector credentials, overlay presets, `active_preset_id`; config store | Headless: configured path; desktop: OS user config directory | Existing versionless JSON with additive defaults | Contains OAuth/client/proxy secrets; public API omits them |
| `comm-relay.db` | Viewer identities, stream sessions, counters, leaderboard and merge audit; viewer store | Beside `config.json` on every OS | Existing Goose-migrated SQLite schema | Viewer identity/activity data; local only |
| overlay asset files | Operator-uploaded panel images; overlay asset service | Existing asset directory associated with config path | Existing validated PNG/JPEG/SVG file contract | Operator-provided local media |
| browser memory | Active workspace, tabs, filters, dirty form and Studio drafts | Per loaded document; not portable or durable | JavaScript state only | Public config and displayed viewer/chat data; no stored secrets |
| browser preference storage | Only preferences already persisted by the current admin, if any | Browser/webview profile | Existing keys and values | Non-secret UI preference data |

## Changed Structures / Formats

No persisted structure, JSON field, SQLite table, asset format, or browser-storage key is added or changed. `overlay.active_preset_id` already exists and retains its meaning. The new activation action changes how that existing field is mutated, not its representation.

Studio draft state and dirty Settings values remain in memory until Publish or Save succeeds. The redesign MUST NOT create a second durable copy of connector secrets or the complete public config in browser storage.

## Atomicity / Concurrency / Locking

Active-preset activation executes through the config store's existing locked mutation path. The handler loads the latest in-memory config under the store's synchronization, verifies that `preset_id` names an existing preset, changes only `overlay.active_preset_id`, validates the result, and persists via the existing atomic JSON write behavior. Failure before replacement leaves the prior file and in-memory configuration authoritative.

Full Settings saves continue to use `POST /api/config/update`. Before a section save or Studio Publish, the client fetches the latest public config and composes only its owned section into that snapshot. The server remains authoritative for secrets and merges omitted secret values under the existing contract. This reduces stale-client overwrites but does not introduce revision numbers or multi-user conflict resolution.

SQLite transactions and locking are untouched. Live statistics and Audience views read current tables through existing APIs; the redesign adds no write path from presentation-only statistics.

## Encryption / Secret Storage / Privacy

Secret storage does not change. Credentials remain in local `config.json` under existing OS-user filesystem permissions and are omitted from `GET /api/config`, config-update responses, and activation responses. The browser receives only existing presence/connection booleans and public fields. No secret, full configuration snapshot, viewer export, or chat history is written to localStorage by this change.

## Migration / Downgrade / Backup / Export

No migration or backfill runs. Existing files are byte-for-byte schema compatible with redesigned and pre-redesign binaries. A downgraded binary ignores the new HTTP route because the client assets are downgraded with it; it continues reading the same `active_preset_id`, presets, SQLite database, and assets.

Existing backup guidance remains sufficient: stop CommRelay and copy the config directory, including `config.json`, `comm-relay.db`, and overlay assets. No new import/export feature is added.

## Corruption Recovery / Cleanup / Uninstall

Existing startup behavior for invalid JSON, SQLite open/migration failure, and missing assets remains authoritative. The UI may report those server errors but MUST NOT silently reset, rewrite, or delete corrupt data. In-memory drafts disappear on page close and require no cleanup. Uninstall behavior and user-data retention are unchanged.

## Verification

- Config-store tests prove activation changes only `active_preset_id`, preserves unrelated values and secrets, rejects missing/unknown IDs, and leaves the file unchanged on error.
- Handler tests prove public responses omit secrets and successful activation broadcasts `overlay_settings`.
- Regression tests load representative legacy/current `config.json` files before and after activation and compare every field except `active_preset_id`.
- Existing SQLite migration, viewer, leaderboard, asset, and config validation tests remain green without schema updates.

## Not applicable

New tables, indexes, migrations, encryption formats, cache eviction, data retention, cloud synchronization, and export formats are not applicable because the redesign changes presentation and one existing-field mutation only.
