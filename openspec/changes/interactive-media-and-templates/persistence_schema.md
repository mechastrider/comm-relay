# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | `streamer_display_name` | Existing config path | Trimmed string ≤ 64 code points | Display name only |
| `comm-relay.db` | Command/award media, volume, layout | Beside config | `image_asset`, `sound_file`, `sound_volume`, `layout` | Filenames, no binary |
| `overlay-assets/` | Panel images plus alert images/sounds | Beside config and DB | Generated `asset_<hex>.<ext>` | Local media; copy with backups |
| Browser memory | Editor preview / Play | Not durable | Object URLs or `/overlay/assets/` | Ephemeral |

## Changed Structures / Formats

Goose on `commands` and `award_types`:

```sql
ALTER TABLE commands ADD COLUMN sound_volume INTEGER NOT NULL DEFAULT 70;
ALTER TABLE commands ADD COLUMN layout TEXT NOT NULL DEFAULT 'card';
ALTER TABLE award_types ADD COLUMN sound_volume INTEGER NOT NULL DEFAULT 70;
ALTER TABLE award_types ADD COLUMN layout TEXT NOT NULL DEFAULT 'card';
```

`layout` allowed values: `card`, `banner`, `fullscreen`. `sound_volume` 0–100. Existing `image_asset` / `sound_file` stay nullable TEXT filenames.

Config:

```json
{ "streamer_display_name": "Jake" }
```

Omitted → `""`.

## Atomicity / Concurrency / Locking

- Upload writes the file first, then the editor save stores the filename. A crash between them may orphan a file; delete of unreferenced names is the cleanup.
- Catalog update that clears media does not delete the file automatically.
- Delete asset checks preset panel image, command, and award references in one read, then removes the file.
- Config save remains the existing atomic replace.

## Encryption / Secret Storage / Privacy

No new secrets. Streamer display name is public config. Asset bytes are local operator media, not logged.

## Migration / Downgrade / Backup / Export

- Additive SQLite columns; old rows get volume 70 and layout `card`.
- Backup = config directory including `overlay-assets`.
- Downgrade: old binary ignores extra columns and config key; custom media stops showing. Files remain.
- Mixed old overlay + new server: extra alert fields ignored; avatar + built-in sound still work.

## Corruption Recovery / Cleanup / Uninstall

Invalid layout/volume rejected on save. Missing asset file at play time is placeholder/silence. Uninstall deletes the config directory (assets included). No automatic orphan sweep besides explicit delete.

## Verification

- Migration defaults volume 70 / layout card.
- Upload kind tests: panel 512 KiB SVG still as today; alert GIF/SVG/HEIC fail; 3 s MP3 succeeds; 20 s WAV fails.
- Create/update reject `C:\` paths.
- Delete in-use filename fails; delete unused succeeds.
- Template tests: `{name}`=`{viewer}`, `{streamer}` empty vs set, `{message}` quote vs `!gg`.

## Not applicable

No second media root, cloud sync, or encrypted asset store.
