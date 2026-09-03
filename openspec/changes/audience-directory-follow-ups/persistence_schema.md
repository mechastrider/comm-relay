# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `comm-relay.db` | Viewer identities (read for unique platform ids) | Existing SQLite beside `config.json` | Schema unchanged; `viewer_identities.platform` already exists | Viewer platform ids; no new PII |
| `config.json` | Unchanged | Existing configured path | Unchanged | No new fields |
| WebView `localStorage` | Audience sort column and direction | Current browser or Wails WebView only; not copied with the config directory | JSON `{ "column": "score"\|"messages"\|null, "direction": "asc"\|"desc" }` under `commRelay.audienceSort` | Low; UI preference only |

## Changed Structures / Formats

No Goose migration and no `config.json` field. `GET /api/viewers` adds an in-memory `platforms` array derived from existing identity rows.

Sort preference:

```json
{ "column": "score", "direction": "desc" }
```

`column` null (or omitted after invalid parse) means last-activity order. The key follows `commRelay.sidebarState`. It is not portable across machines or browsers.

## Atomicity / Concurrency / Locking

- Platform collapse runs under the existing store mutex after the list query; it does not add a writer or a second database file.
- Sort writes to `localStorage` are last-write-wins per WebView. Unavailable storage falls back to last-activity order without blocking the table.
- Viewer merge, session start, and score mutations keep their current transactions.

## Encryption / Secret Storage / Privacy

No secret format changes. List JSON still omits identity logins. Sort preference MUST NOT be logged or copied into diagnostics. Backup of the config directory does not include WebView storage and does not need to.

## Migration / Downgrade / Backup / Export

- No eager rewrite of SQLite or config.
- Older binaries ignore `platforms`.
- Newer admin against an older server uses `[last_seen.platform]` when `platforms` is absent.
- Invalid or absent `commRelay.audienceSort` falls back to last-activity order; do not delete other `commRelay.*` keys.
- Uninstall/WebView data wipe removes the sort preference with other origin storage.

## Corruption Recovery / Cleanup / Uninstall

Malformed list rows omit or empty `platforms` without failing the whole list when the store can still return viewers. Corrupt sort JSON is ignored. No new temp files or caches to clean.

## Verification

- Store tests: merged Twitch+YouTube viewer, duplicate platform collapsed, last-seen-first order.
- API tests: list includes `platforms` and omits `identities`; get still returns identities.
- Client tests: valid sort round-trip, invalid JSON fallback, missing `platforms` fallback to `last_seen.platform`.

## Not applicable

No new table, column, index, encryption key, asset cache, media directory, retention job, cloud sync, import format, or installer-owned data.
