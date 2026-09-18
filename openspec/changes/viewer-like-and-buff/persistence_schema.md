# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| SQLite | Command social fields, level quotas, buff events, session uses derived from events; `internal/store` | Existing database beside `config.json` | Additive Goose migration after `00020_command_aliases.sql` (next free number at apply time) | Viewer ids linked to XP |
| `config.json` | `buffs_per_award_per_viewer`, `buff_max_unique_viewers` | Existing portable config path | Integers ≥ 0; omitted → 1 and 5 | Not sensitive |
| Process memory | `command_outcome` including `rejected` + `reason` | In-process matcher map | Existing bounded map | Message ids, not chat bodies |
| Browser/webview preferences | Unchanged | Existing profile | Unchanged | Not sensitive |

Do not move these caps into SQLite. Do not add a second database.

## Changed Structures / Formats

Implementation may adjust SQL spelling if keys, constraints, and behavior remain equivalent.

### `commands`

| Column | Contract |
|--------|----------|
| `action` | Allow `alert`, `show_leaderboard`, `like`, `buff`. Existing rows stay `alert` or `show_leaderboard` |
| `points INTEGER NULL` | Required positive 1–1000 when `action` is `buff`; NULL otherwise |
| `award_id TEXT NULL` | Required existing award type id when `action` is `like`; NULL otherwise |

SQLite CHECK on `action` may need table rebuild. Reject saves that violate the pairing.

### `progression_levels`

| Column | Contract |
|--------|----------|
| `like_quota INTEGER NOT NULL DEFAULT 1` | 0–100 |
| `buff_quota INTEGER NOT NULL DEFAULT 1` | 0–100 |

Starter ids `recruit`…`legend` backfill 1…5 when the column is added if still at default 1 **or** set explicitly in the same migration from `min_xp` order: 1,2,3,4,5 for the five seeds. Custom operator levels keep DEFAULT 1.

### `interaction_events`

| Column | Contract |
|--------|----------|
| `kind` | Allow `command`, `award`, `activity`, `buff` |
| `recipient_viewer_id TEXT NULL` | Required for `buff`; recipient canonical id |
| `parent_event_id TEXT NULL` | Required for `buff`; operator award event id in the same table |
| `viewer_id` | Giver for `buff` and `command`; recipient for `award` (including viewer likes) |

Index `(parent_event_id, viewer_id)` for cap checks and `(session_id, viewer_id, kind)` for quotas. Chat text remains forbidden.

Quota remaining is computed from committed events in the open session (like commands by giver; buff events by giver). Do not store a separate uses table unless a race requires it; the grant/buff transaction MUST count inside the same lock as today.

### Bootstrap

Persist a one-time social-catalog marker (same metadata table as other bootstraps). Insert missing `viewer_like`, commands `like`/`buff`, and achievements `cheerleader` / `chat_favorite` / `copilot` without modifying existing colliding triggers or existing award rows.

## Atomicity / Concurrency / Locking

Like and buff commit XP, events, and cap/quota checks in one store transaction under the existing store mutex. Two concurrent `!buff` targeting the same award MUST not exceed unique-viewer cap. Failed event insert rolls back XP.

## Encryption / Secret Storage / Privacy

No new secrets. Events store ids and points only.

## Migration / Downgrade / Backup / Export

Additive Goose up-migration. Backup remains “copy the SQLite file with overlay-assets”. Downgrade: older binaries may fail to read unknown `action` or `kind`; operators can delete social commands before downgrade. Already granted XP stays in viewer counters.

## Corruption Recovery / Cleanup / Uninstall

Uninstall is still deleting the data directory. Orphan `parent_event_id` MUST make that award unbuffable (`no_award`) without crashing ingest.

## Verification

Store tests: migration from a 00020-era fixture; cap uniqueness; quota across restart; like award event on recipient; buff event does not increment original award_id counts.

## Not applicable

Encrypted at-rest DB, export/sync, moving config into SQLite.
