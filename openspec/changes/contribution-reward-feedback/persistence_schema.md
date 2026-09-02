# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | Operator overlay presets and per-surface opacity | Existing configured path beside executable or in user config dir; copied with current backups | Additive optional JSON fields under `overlay.presets[].surfaces` | Low; no secrets added |
| `comm-relay.db` | Viewer score and interaction-event message reference | Existing SQLite beside config | Schema unchanged; existing `message_platform` and `message_id` columns only | Viewer identifiers; no message text |
| Award request / WebSocket frame | Transient selected message quote | Process memory and local network buffers only | Optional bounded `message_text` string | Ephemeral chat content |
| Browser runtime state | Alert lanes, receive timestamps, highlight timers, latest leaderboard snapshots | Memory of each admin/OBS browser context | Plain JavaScript objects; never serialized by this change | Ephemeral event/display data |
| Existing local preferences | Preview/setup/browser-only preferences | Existing browser/WebView storage | Unchanged | Low |

## Changed Structures / Formats

Each overlay preset may add these optional numbers:

```json
{
  "surfaces": {
    "chat": { "panel_opacity": 0.2 },
    "leaderboard": { "panel_opacity": 0.65 },
    "alerts": { "panel_opacity": 0.4 }
  }
}
```

Every value is inclusive 0–1. Omission normally means inherit `style.panel_opacity`. One compatibility distinction is intentional: legacy cockpit presets with shared zero used fixed theme glass before these fields existed, so omission preserves that historical glass while storing an explicit zero makes only that surface transparent. Existing `surfaces.leaderboard.font_size_px` and `layout` remain in the same object.

The SQLite format does not change. Award events continue to write only existing `message_platform` and `message_id`. `message_text`, bounded quote text, alert queue state, and reward highlight state have no durable field.

## Atomicity / Concurrency / Locking

- Studio surface opacity remains a draft until the existing Publish/config-update transaction validates and atomically replaces `config.json`.
- A failed validation or write leaves the prior file and active preset unchanged.
- Publishing one preset must preserve unrelated config values, secrets, other presets, and all three opacity overrides.
- Award score mutation and existing interaction-event append behavior are unchanged; transient quote construction does not add a database transaction or lock.
- Multiple browser clients keep independent in-memory display queues and snapshots; no cross-process shared-memory lock is introduced.

## Encryption / Secret Storage / Privacy

No credential or secret format changes. Public config exposes only non-secret opacity numbers as it exposes other appearance fields. The server MUST NOT write submitted `message_text` or its truncated form to SQLite, `config.json`, logs, diagnostics, temporary files, crash metadata, or error bodies. Browser clients MUST discard it when the frame and rendered alert/highlight become unreachable.

## Migration / Downgrade / Backup / Export

- No Goose migration and no eager config rewrite are required.
- On load, legacy non-cockpit presets resolve every surface opacity from shared `style.panel_opacity`; a legacy cockpit preset with shared zero and no override preserves its theme's historical glass alpha at render time.
- Studio MUST NOT materialize a per-surface opacity merely by opening, previewing, switching surfaces, or publishing an otherwise unchanged preset. The first explicit edit opts only that surface into the stored value, including an explicit transparent zero.
- Downgraded binaries ignore unknown `surfaces.chat`/`surfaces.alerts` and unknown `panel_opacity` fields according to current additive config behavior, while shared `style.panel_opacity` remains the compatibility fallback.
- Existing backup/export behavior remains sufficient: copy/export the config directory. There is no new asset or database file.

## Corruption Recovery / Cleanup / Uninstall

Existing invalid-config handling applies. Out-of-range or malformed surface opacity rejects the update rather than coercing persisted data. In-memory alert lanes, quotes, snapshots, and timers disappear on reload/process exit and need no cleanup. Uninstall and local-data removal remain unchanged.

## Verification

- Config round-trip tests cover all three explicit values, omission fallback, unrelated-field preservation, and rejection below 0/above 1.
- Legacy preset tests prove identical effective opacity before and after a no-edit Studio publish.
- Interaction-event/store tests assert the schema is unchanged and no message-text column/value is written.
- API/WebSocket tests prove only the bounded transient quote reaches the alert payload.
- A repository search/test fixture must fail if award `message_text` is passed to structured logging or durable store input.

## Not applicable

No database table/column/index migration, encryption-key change, asset cache, media directory, retention job, cloud sync, import format, or installer-owned data is introduced.
