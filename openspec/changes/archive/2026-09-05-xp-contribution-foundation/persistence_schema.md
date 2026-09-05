# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `comm-relay.db` | Canonical viewer XP, session/day windows, activity counters, award types, interaction events | Beside `config.json`; copied with the config directory | Goose SQLite; `xp` columns replace `score`; session activity fields | Viewer identifiers; no chat text |
| `config.json` | Activity interval, session limit, activity XP; `day_reset_hour` unchanged | Existing configured path | Additive JSON integers | Low; no secrets |
| Browser/WebView `localStorage` | Audience sort column/direction | Origin-scoped; not in backups | Existing `commRelay.audienceSort`; column `score` maps to `xp` | Low UI preference |
| Process memory | Live leaderboard snapshots | Not durable | Existing hub/admin caches using `xp` | Ephemeral |

## Changed Structures / Formats

SQLite (Goose `00003`):

```sql
ALTER TABLE viewers RENAME COLUMN score TO xp;
ALTER TABLE viewer_session_stats RENAME COLUMN score TO xp;
ALTER TABLE viewer_day_stats RENAME COLUMN score TO xp;
ALTER TABLE viewer_session_stats ADD COLUMN activity_grants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE viewer_session_stats ADD COLUMN last_activity_at TEXT NULL;
```

Numeric XP values are unchanged by the rename. `activity_grants` is ≥ 0. `last_activity_at` is RFC3339 UTC or NULL.

Award seed inserts (same migration, `INSERT` only when `id` is absent):

| id | name | points |
|----|------|-------:|
| spotter | Spotter | 25 |
| intel | Intel | 30 |
| expert | Expert | 40 |
| meme | Meme | 20 |
| clutch | Clutch Help | 50 |
| mvp | MVP | 100 |

Splash templates include `{name}` and `{points}`. Joke and Advice rows are not updated.

`interaction_events.kind` MAY be `activity` with `points` = granted XP. No new event columns.

Config JSON:

```json
{
  "activity_interval_seconds": 300,
  "activity_session_limit": 10,
  "activity_xp": 1
}
```

`points_per_message` is ignored on load and MUST NOT be written as the progress rule. Public GET omits it or does not treat it as operator-controlled progress.

Audience sort JSON in `localStorage` may still contain `"column":"score"`; runtime treats that as `xp` and MAY rewrite the stored column on the next sort change.

## Atomicity / Concurrency / Locking

- Message-count increment and optional activity XP grant for one ingest MUST occur in one SQLite transaction so a crash cannot add activity without the matching counts (or vice versa).
- Award grant remains one transaction for XP + interaction event, as today.
- Merge sums `xp` windows and, for the current session row, sums `activity_grants` and keeps the later non-null `last_activity_at`.
- Config publish remains the existing atomic `config.json` replace. Invalid activity fields reject the whole update.
- Leaderboard broadcasts happen after the transaction commits.

## Encryption / Secret Storage / Privacy

No new secrets. Activity events MUST NOT persist message text. Viewer ids remain as today.

## Migration / Downgrade / Backup / Export

- Goose applies `00003` on startup before serving. Existing XP totals are the renamed `score` numbers.
- Fresh databases apply `00001`–`00003` (Joke/Advice from `00002`, extra seeds from `00003`).
- Backup remains copy of the config directory (DB + `config.json`).
- Downgrade to a binary that expects `score` columns will fail to open the migrated DB. Operators who may roll back MUST keep a pre-upgrade copy. There is no automatic down-migration in the product upgrade path.
- An old binary against a new `config.json` that omitted `points_per_message` will default it to 1 and resume per-message scoring; that is documented rollback, not a supported mixed install.

## Corruption Recovery / Cleanup / Uninstall

Existing invalid-config and SQLite-open failures apply. Negative activity settings are rejected, not coerced. Uninstall/data wipe is unchanged (delete the config directory). `localStorage` sort keys are origin data and disappear with browser/WebView profile wipe.

## Verification

- Migration tests: pre-`00003` fixture with `score` 7 becomes `xp` 7; `activity_grants` 0.
- Seed tests: missing ids inserted; existing custom id not overwritten; delete + restart does not resurrect.
- Config tests: omitted activity fields default; legacy `points_per_message` does not increment XP per line; invalid negatives return field errors.
- Store tests: activity interval, limit, disable-via-zero, restart preserves session counters, merge sums activity, New stream zeros session XP and activity.
- API tests: payloads contain `xp` and omit `score`.

## Not applicable

No new database file, encryption keys, overlay-asset changes, cloud sync, or installer-owned data.
