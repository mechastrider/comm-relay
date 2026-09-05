# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `comm-relay.db` | Custom portrait filename, ranking hide, per-identity cache filename | SQLite beside `config.json` | New nullable/default columns; Goose migration | Viewer faces and hide flags |
| `overlay-assets/` | Cached platform portraits and custom uploads | Same config directory | Generated `asset_<hex>.png\|jpg\|jpeg\|webp` | Viewer PII images |
| `config.json` | `custom_avatars_enabled`; preset `surfaces.leaderboard.title`, `max_entries` | Existing configured path | Additive JSON | Non-secret operator prefs |
| WebView `localStorage` | Unchanged | Current browser/WebView | Unchanged | N/A |

## Changed Structures / Formats

Goose (next id after `00009`):

```sql
ALTER TABLE viewers ADD COLUMN custom_avatar TEXT NOT NULL DEFAULT '';
ALTER TABLE viewers ADD COLUMN leaderboard_hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE viewer_identities ADD COLUMN avatar_cache TEXT NOT NULL DEFAULT '';
```

`custom_avatar` and `avatar_cache` store overlay-asset filenames only, never filesystem paths or remote URLs. Remote URL remains `viewer_identities.avatar_url`.

Config:

```json
{
  "custom_avatars_enabled": true,
  "overlay": {
    "presets": [
      {
        "surfaces": {
          "leaderboard": {
            "title": "",
            "max_entries": 5
          }
        }
      }
    ]
  }
}
```

Omitted `custom_avatars_enabled` → true. Omitted `max_entries` → 5. Omitted `title` → empty (no heading).

## Atomicity / Concurrency / Locking

- Column updates use existing store mutex/transactions.
- Asset write then DB filename; if DB fails after write, unreferenced file MAY remain until a later unused-asset cleanup or overwrite.
- Cache worker must not hold the store lock during HTTP.
- Replace cache file when `avatar_url` changes; do not accumulate per-message files.

## Encryption / Secret Storage / Privacy

No encryption at rest beyond existing disk. Do not put portrait files or remote avatar URLs into `GET /api/diagnostics`. Backup of the config directory includes DB + `overlay-assets` and therefore faces.

## Migration / Downgrade / Backup / Export

- Migrate on startup via Goose.
- Older binaries ignore new columns and extra asset files.
- New binary on old DB applies the migration once.
- Downgrade: custom/hide/cache columns unused; default rank cap in the old binary remains 20.
- Operators copying data MUST include `overlay-assets` with the DB or portraits 404.

## Corruption Recovery / Cleanup / Uninstall

- Missing asset file: fall back to remote URL then placeholder; do not delete the viewer.
- Invalid filename in DB: treat as empty.
- Clearing custom unlinks the viewer; delete the file only when nothing else references that name.
- Uninstall/config-dir delete removes cache files with the rest of user data.

## Verification

- Store tests: hide omitted from leaderboard and present in list; custom overrides cache; disabled custom uses cache.
- Migration test on a pre-change fixture DB.
- Upload tests: PNG ok, GIF 400, oversize 400.
- Fetch tests: private IP rejected; ingest succeeds when fetch fails.

## Not applicable

No new database engine, no secrets store, no cloud sync, no installer-owned data, no `localStorage` keys.
