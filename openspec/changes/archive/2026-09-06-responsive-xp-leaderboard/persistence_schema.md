# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | Operator-owned overlay preset presentation | Existing user config directory or explicit `-config` path | Additive `overlay.presets[].surfaces.leaderboard` JSON fields | Non-secret appearance text/settings |
| SQLite | Viewer identity, XP, message counts | Existing database beside config | Unchanged | Existing viewer data |
| Browser preferences/cache | Studio mode and preview preferences | Existing browser/WebView local storage | Unchanged | Non-sensitive |

## Changed Structures / Formats

The leaderboard surface may add:

```json
{
  "sizing_mode": "auto",
  "font_size_px": 18,
  "title_mode": "theme",
  "title": "Top stream",
  "show_message_count": false,
  "max_entries": 5
}
```

`font_size_px` is meaningful when sizing is fixed and may remain present in a legacy preset. `title` is meaningful when title mode is custom. Serialization SHOULD omit redundant defaults while public config resolution remains deterministic.

## Atomicity / Concurrency / Locking

Preset updates continue through the existing config update transaction and atomic temp-file rename. Publish replaces a complete validated preset draft; resize observations are runtime-only and never write config. No new shared database lock is introduced.

## Encryption / Secret Storage / Privacy

No secret or credential field is added. Custom title is operator-authored visible overlay copy. Existing public-config secret omission remains unchanged.

## Migration / Downgrade / Backup / Export

No SQLite migration. JSON fields are additive. Legacy resolution is presence-aware: a specific leaderboard font without sizing mode stays fixed; a non-blank title without title mode becomes custom; otherwise auto sizing/theme title apply. Old binaries ignore unknown fields and continue reading known font/title/cap fields. Existing config backup/export includes the new fields automatically.

## Corruption Recovery / Cleanup / Uninstall

Invalid enums, bounds, or custom-title combinations fail existing config validation without partially replacing the stored file. No cache/file cleanup changes. Uninstall behavior remains removal of the existing config directory by the operator.

## Verification

- Config tests cover new defaults, legacy resolution, round-trip serialization, and invalid combinations.
- Public-config/API tests confirm values are exposed and secrets remain omitted.
- Studio JS tests cover normalization without materializing unchanged legacy defaults.

## Not applicable

Database schemas, file assets, encryption, keychain use, export formats, retention, and cache eviction do not change.
