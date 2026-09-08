# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite `viewer_contracts` | Contract lifecycle and reward snapshot; `internal/store` | Existing viewer database beside `config.json`; follows current per-OS user data path and portable `-config` behavior | Additive Goose migration; UUID text ids and UTC RFC3339Nano timestamps | Local operator-authored task text plus canonical viewer reference; not a secret |
| SQLite `interaction_events.contract_id` | Optional provenance for a contract winner award; `internal/store` | Same database and backup boundary | Nullable text foreign key to `viewer_contracts(id)` | Viewer/reward audit metadata; no chat or objective text |
| `config.json` | Existing operator settings | Unchanged | No new keys | Unchanged, including OAuth secrets |
| overlay assets | Existing validated catalog images/sounds | Existing overlay-assets directory | Generated filenames referenced by reward snapshot | Unchanged; no new upload surface |
| browser preferences/cache | Unsaved contract draft and transient search results | Current page memory only | JavaScript state, not localStorage | Cleared on reload; contains operator-entered text only |

## Changed Structures / Formats

Migration `00015_viewer_contracts.sql` creates:

```sql
CREATE TABLE viewer_contracts (
    id TEXT NOT NULL PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('active', 'awarded', 'closed')),
    active_slot INTEGER UNIQUE CHECK (active_slot IS NULL OR active_slot = 1),
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    reward_name TEXT NOT NULL,
    reward_points INTEGER NOT NULL CHECK (reward_points > 0),
    reward_splash_template TEXT NOT NULL,
    reward_sound TEXT NOT NULL DEFAULT '',
    reward_duration_ms INTEGER NOT NULL,
    reward_image_asset TEXT NULL,
    reward_sound_file TEXT NULL,
    reward_sound_volume INTEGER NOT NULL CHECK (reward_sound_volume BETWEEN 0 AND 100),
    reward_layout TEXT NOT NULL CHECK (reward_layout IN ('card', 'banner', 'fullscreen')),
    reward_image_fit TEXT NOT NULL CHECK (reward_image_fit IN ('cover', 'contain', 'fill', 'tile')),
    reward_image_size_pct INTEGER NOT NULL CHECK (reward_image_size_pct BETWEEN 25 AND 300),
    winner_viewer_id TEXT NULL REFERENCES viewers(id),
    announced_at TEXT NOT NULL,
    settled_at TEXT NULL,
    CHECK (
        (status = 'active' AND active_slot = 1 AND winner_viewer_id IS NULL AND settled_at IS NULL)
        OR (status = 'awarded' AND active_slot IS NULL AND winner_viewer_id IS NOT NULL AND settled_at IS NOT NULL)
        OR (status = 'closed' AND active_slot IS NULL AND winner_viewer_id IS NULL AND settled_at IS NOT NULL)
    )
);
CREATE INDEX idx_viewer_contracts_status_announced
    ON viewer_contracts(status, announced_at DESC);
```

`reward_id` deliberately has no foreign key to `award_types`: deletion/rename of catalog data must not strand an active promise. All `reward_*` fields are copied in the same transaction that opens the contract. Text length limits are enforced in the domain/API using Unicode code points; the database still enforces non-empty trimmed values before insert through store validation.

The migration adds nullable `contract_id TEXT REFERENCES viewer_contracts(id)` to `interaction_events` and `idx_interaction_events_contract_id`. Existing events remain null. Contract awards keep kind `award`; reward-history queries and response shapes do not change.

## Atomicity / Concurrency / Locking

All contract methods use the existing `Store.mu` and the single SQLite connection. Open loads the award snapshot and inserts the active row in one transaction. `active_slot=1` plus its unique constraint is the database-level guard against concurrent active contracts.

Award settlement is one transaction: select the matching active id, validate the visible canonical viewer, ensure session/day keys, capture rank state, increment all-time/session/day XP, append the award interaction event with `contract_id`, transition the contract to `awarded` with `active_slot=NULL`, and commit. Close similarly transitions the matching active row to `closed`. Each terminal update includes `WHERE id=? AND status='active' AND active_slot=1`; zero affected rows maps to conflict. Alerts and leaderboard frames occur only after commit.

No-result close and failed/racing requests cannot partially change XP or events. Existing transaction rollback and test failure-hook patterns are extended to contract settlement.

## Encryption / Secret Storage / Privacy

No encryption policy changes. The database remains local and uses current filesystem protections. Contract title/objective are not credentials, but are excluded from Info logs and interaction events. OAuth tokens remain only in existing config storage and are never copied. No chat message text, platform credential, remote URL, or viewer identity detail beyond canonical `winner_viewer_id` is added to contract rows.

## Migration / Downgrade / Backup / Export

- Append migration 15; never edit migrations 1–14.
- Verify upgrade from version 14, fresh creation through version 15, down to 14, then up again. The up path has no backfill because existing databases have no contract rows.
- Down drops the interaction-event contract index and column before dropping `viewer_contracts`. Downgrade deletes contract rows/provenance and therefore requires the operator's normal data backup if that audit state matters.
- Running an older application binary against the additive schema must remain safe: its named-column interaction-event inserts omit nullable `contract_id`, and it ignores the extra table. Confirm this in a compatibility test rather than relying only on SQLite permissiveness.
- Existing database backup/export behavior automatically includes contract rows because there is no second file. Config-only exports remain config-only.

## Corruption Recovery / Cleanup / Uninstall

Migration or integrity failure follows current store startup failure handling and logs the wrapped cause; the application must not silently recreate or discard the viewer database. Recovery is restore-from-backup or a verified migration down/up procedure.

Terminal contract rows are intentionally retained without automatic pruning for idempotency and audit. They are not exposed by a history UI. Snapshot asset filenames do not own files; existing reference-safe catalog cleanup may remove them, after which alert rendering uses its safe built-in fallback. Uninstall and manual data removal follow the existing per-OS data-directory behavior; no new path remains behind.

## Verification

- Migration tests: 14→15, fresh→15, 15→14→15, foreign-key check, schema columns/indexes/checks, and older-writer compatibility.
- Store tests: one-active unique constraint, complete snapshot after catalog edit/delete, restart read, no-result close, missing/hidden viewer, racing settlement, and injected rollback at event/transition commit boundaries.
- Data tests: exactly one award event with `contract_id`, unchanged reward-history response shape, no event for no-result close, and correct all/session/day XP.
- Privacy tests/review: no title/objective in events, reward-history JSON, or structured Info logs.

## Not applicable

No config format, secret/keychain handling, cache format, user-selected filesystem path, cloud synchronization, remote database, registry/plist entry, or separate export file changes.
