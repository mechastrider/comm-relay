# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| Viewer SQLite database | Greeting definitions, canonical-viewer exclusion, all-time/session ordinary-message markers | Existing database beside `config.json`; moves with the current data directory | Goose-managed SQLite | Viewer identifiers and interaction timing; local private data |
| Overlay assets | Optional greeting image and custom sound | Existing `overlay-assets` directory beside `config.json` | Generated safe filenames; existing MIME/size policy | Operator-provided media |
| Config/preferences | No greeting data | Existing `config.json` | Unchanged | Unchanged |
| Secrets/cache | No greeting-specific state | Existing locations | Unchanged | Unchanged |

## Changed Structures / Formats

Add a `greeting_definitions` table with exactly two reserved ids:

| Column | Type / constraint | Meaning |
|--------|-------------------|---------|
| `id` | TEXT PK; `new_viewer` or `returning_viewer` | Fixed behavior identity |
| `enabled` | INTEGER NOT NULL DEFAULT 0, boolean check | Independent operator switch |
| `splash_template` | TEXT NOT NULL | Bounded plain-text template |
| `sound` | TEXT NOT NULL DEFAULT `''` | Existing built-in tone id or silence |
| `duration_ms` | INTEGER NOT NULL DEFAULT 5000, existing bounds | Display duration |
| `image_asset` | TEXT NULL | Existing generated asset filename |
| `sound_file` | TEXT NULL | Existing generated asset filename |
| `sound_volume` | INTEGER NOT NULL DEFAULT 70, 0–100 | Playback volume |
| `layout` | TEXT NOT NULL DEFAULT `card`, enum check | `card`, `banner`, or `fullscreen` |
| `image_fit` | TEXT NOT NULL DEFAULT `contain`, enum check | Existing alert image-fit values |
| `image_size_pct` | INTEGER NOT NULL DEFAULT 100, 25–300 | Per-greeting graphic scale |

The locale-aware store bootstrap inserts both definitions idempotently with Russian or English starter templates from `admin.time_locale`, always disabled. An upgrade with no greeting rows uses the current locale; later locale changes never translate or recreate operator-owned values.

Add to `viewers`:

- `greetings_disabled INTEGER NOT NULL DEFAULT 0` with boolean check;
- `first_ordinary_message_at TEXT NULL` as the durable first-ever marker.

Add to `viewer_session_stats`:

- `first_ordinary_message_at TEXT NULL` as the marker for that viewer/session pair.

Timestamps use the existing RFC3339Nano text format. Only null versus non-null is normative for qualification; the timestamp supports diagnostics and migration inspection.

## Atomicity / Concurrency / Locking

For an ordinary identified line, identity upsert, existing counters/activity, both marker reads/conditional writes, and the resulting greeting kind are one SQLite transaction under the Store's existing mutex. Conditional `NULL → timestamp` updates determine the winner if internal locking changes later. Definition enablement and viewer exclusion are read in the same transaction for a committed outcome, but markers are written regardless of suppression. Broadcast happens after commit and cannot roll state back.

Viewer merge updates the survivor transactionally: `greetings_disabled` is logical OR; first-ever marker is the earliest non-null timestamp; each merged session marker is the earliest non-null timestamp. The hidden merge source remains audit data and cannot qualify independently.

## Encryption / Secret Storage / Privacy

No new secret exists and no encryption scheme changes. Data inherits the local database's filesystem protections. Logs must not contain message text, templates, absolute asset paths, tokens, or secrets. API payloads expose generated asset names rather than filesystem paths.

## Migration / Downgrade / Backup / Export

Use the next ordered, idempotent Goose migration. Create the greeting table and additive columns before backfill. Backfill `viewers.first_ordinary_message_at` from `last_seen_at` where existing `message_count > 0`. Backfill session markers for existing `viewer_session_stats.message_count > 0` using the owning session start or viewer last-seen timestamp; this deliberately prevents surprise greetings in an already active session. Leave zero-message rows null.

Existing data-directory backup/export automatically includes the table, columns, and referenced overlay assets. Downgrade leaves additive state in place; older binaries ignore it. A later re-upgrade must not overwrite edited definitions or clear markers.

## Corruption Recovery / Cleanup / Uninstall

Missing or invalid reserved definitions is a store integrity error surfaced to diagnostics/admin; the UI must not offer ad-hoc recreation. Existing database recovery guidance applies. Clearing a greeting media reference may delete an asset only through the shared unreferenced-asset check so command, award, contract, viewer, and other greeting references remain safe. Uninstall/data deletion behavior is unchanged.

## Verification

- Migration tests cover fresh database, populated upgrade, open-session backfill, re-open idempotency, and down/up compatibility where supported.
- Store tests cover new/returning precedence, command exclusion, disabled/excluded consumption, restart persistence, concurrent lines, cross-platform merge, and exclusion OR.
- Catalog tests cover locale-aware bootstrap without later translation or restoration.
- Asset reference tests include both greeting definitions.
- A real upgraded database fixture confirms existing viewers are not greeted retroactively.

## Not applicable

No config format, OAuth storage, connector cache, system keychain, registry, browser local storage, cloud sync, or remote backup contract changes.
