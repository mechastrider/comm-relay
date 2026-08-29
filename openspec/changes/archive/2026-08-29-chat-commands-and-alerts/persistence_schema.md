# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite | Commands, award types, interaction events | `comm-relay.db` beside `config.json` (same folder as 6a) | Goose SQL, WAL | Viewer ids, not chat text |
| config.json | `hide_command_messages` | Existing operator config path | JSON boolean, default false | Not secret |
| Memory | Per-viewer command cooldown until | Process only | map | Lost on restart |
| Overlay JS | Alert FIFO | Browser Source | In-page | Not persisted |

Do not move catalogs into `config.json`. Do not store secrets in the new tables.

## Changed Structures / Formats

Goose `00002` (name may vary) additive:

**`commands`:** `id` TEXT PK, `trigger` TEXT UNIQUE NOT NULL (slug `^[a-z0-9_]{1,32}$`, no `!`), `enabled` INTEGER NOT NULL, `cooldown_seconds` INTEGER NOT NULL CHECK ≥ 0, `splash_template` TEXT NOT NULL, `sound` TEXT NOT NULL DEFAULT `''`, `duration_ms` INTEGER NOT NULL DEFAULT 5000, `image_asset` TEXT NULL, `sound_file` TEXT NULL.

**`award_types`:** `id` TEXT PK, `name` TEXT NOT NULL, `points` INTEGER NOT NULL CHECK ≥ 1, `splash_template` TEXT NOT NULL, `sound` TEXT NOT NULL DEFAULT `''`, `duration_ms` INTEGER NOT NULL DEFAULT 5000, `image_asset` TEXT NULL, `sound_file` TEXT NULL.

**`interaction_events`:** `id` TEXT PK, `kind` TEXT NOT NULL (`command` \| `award`), `viewer_id` TEXT NULL REFERENCES `viewers(id)`, `command_trigger` TEXT NULL, `award_id` TEXT NULL, `points` INTEGER NOT NULL, `message_platform` TEXT NULL, `message_id` TEXT NULL, `created_at` TEXT NOT NULL. Index on `(viewer_id, created_at)`.

Seed INSERT (once): commands `gg`, `hi` (enabled, cooldown 30, duration 5000); award types Joke points 10, Advice points 50. Default templates include `{name}` and, for awards, `{points}`.

**Config:** `hide_command_messages` boolean. Public config JSON includes it.

**Score:** no new counter columns; grant updates existing `viewers.score`, `viewer_session_stats.score`, `viewer_day_stats.score`.

## Atomicity / Concurrency / Locking

Grant, command fire log, and merge rewrite of `interaction_events.viewer_id` run under the existing store mutex / SQL transaction. Merge: re-point events from `from_id` to `into_id` in the same transaction as identity move. Catalog CRUD uses the same writer.

## Encryption / Secret Storage / Privacy

No encryption beyond existing disk file. Events omit message body. No tokens.

## Migration / Downgrade / Backup / Export

- `goose.Up` on start; fail closed if migrate fails.
- Never edit applied SQL.
- Backup remains copy of the config directory (`config.json` + `comm-relay.db`).
- Downgrade: old binary ignores new tables and the JSON key (additive default).
- No operator export UI in this change.

## Corruption Recovery / Cleanup / Uninstall

Same as 6a: delete or replace `comm-relay.db` loses viewers, catalogs, and events. Uninstall does not add new paths. Cooldown memory needs no cleanup.

## Verification

Temp-dir test: migrate 00001+00002, assert four seed rows, delete `gg`, reopen store, `gg` still absent. Grant joke increments score and inserts one event. Merge rewrites event `viewer_id`.

## Not applicable

Separate cache, keychain, or cloud sync.
