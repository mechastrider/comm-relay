## 1. Store bootstrap metadata

- [x] 1.1 Add migration `00009_store_bootstrap.sql` creating `store_bootstrap` key/value table
- [x] 1.2 Persist pre-migrate `pending:<locale>` or adopted state and implement `starter_catalog_initialized` helpers

## 2. Localized starter catalog

- [x] 2.1 Add `starter_catalog.go` with Russian and English definitions (stable ids/triggers)
- [x] 2.2 Extend `store.Open` with `TimeLocale` option; apply or adopt catalog in one transaction
- [x] 2.3 Pass `cfg.Admin.TimeLocale` from `internal/bootstrap/app.go`

## 3. Tests and specs

- [x] 3.1 Add store tests: fresh ru/en, adoption, interrupted bootstrap, locale change, delete, empty catalog, idempotency
- [x] 3.2 Update OpenSpec canonical specs and archive change
- [x] 3.3 Append Russian `CHANGELOG.md` Unreleased bullet
