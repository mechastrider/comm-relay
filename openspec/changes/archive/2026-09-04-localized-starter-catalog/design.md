## Context

Migrations `00002` and `00003` insert English starter rows. Config loads before SQLite in bootstrap and exposes `admin.time_locale` (`ru-RU` or `en-GB`). Seeds are ordinary user data: deletable, editable, and must never be restored or auto-translated after initialization.

## Goals / Non-Goals

**Goals**

- One-time localized starter catalog for new database files.
- Stable ids/triggers across locales; only splash templates and award display names vary.
- Deterministic, idempotent initialization; adoption of existing installations without catalog mutation.

**Non-Goals**

- Per-request translation, translation tables, reset/translate UI, or expanding the public locale set.

## Decisions

1. **`store_bootstrap` table** — key/value metadata (`starter_catalog_initialized`) records whether locale bootstrap ran. Empty catalog after initialization is valid user state and must not trigger re-seeding.

2. **Crash-safe new vs existing database state** — before `goose.Up`, create the metadata table idempotently and persist one of two states. A database with no applied Goose version gets `pending:<locale>`; a database with an applied version gets `1` and is adopted without touching catalog rows. The insert uses `ON CONFLICT DO NOTHING`, so a retry preserves the locale selected on the first attempt and resumes an interrupted fresh-database bootstrap.

3. **Go-side catalog definitions** — localized strings live in `internal/store/starter_catalog.go`. English values match post-`00008` observable defaults byte-for-byte.

4. **Migration `00009`** — additive only: create `store_bootstrap` with `IF NOT EXISTS`, because fresh-database bootstrap prepares it before Goose runs. Do not rewrite historical migrations or delete migration-era seeds.

5. **`store.Open(path, opts)`** — `opts.TimeLocale` comes from validated config. Unsupported locales fall back to `ru-RU` via existing config defaults before reaching the store.

## Risks / Trade-offs

- New databases still receive English rows from historical migrations briefly before Go overwrites localized fields in one transaction — acceptable because initialization completes in the same `Open` call.
- The metadata table is created just before migrations rather than exclusively by Goose. Migration `00009` remains the schema history authority and is idempotent with that preparation step.

## Migration Plan

- Ship `00009` with the release binary. Upgrading installations set `starter_catalog_initialized` before migration without catalog changes. Fresh installations persist `pending:<locale>` before migration and atomically replace it with `1` after applying the localized catalog.
