## Why

Starter commands and awards are inserted as fixed English rows during SQLite migrations, while the operator's interface locale (`admin.time_locale`) may be Russian. Fresh installs should receive localized example catalog text once, without ever re-translating user-owned rows later.

## What Changes

- Add `store_bootstrap` metadata and a one-time Go-side starter catalog initializer keyed by `admin.time_locale`.
- Fresh databases receive Russian or English splash/name text for stable seed ids (`gg`, `hi`, `joke`, …); existing upgraded databases adopt their current catalog unchanged.
- Historical migrations keep their applied seed inserts for upgrade safety; locale application runs only for genuinely new database files.
- Update chat-commands and operator-rewards specs to describe locale-aware one-time initialization instead of migration-fixed English fixtures.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `chat-commands`: replace migration-fixed English seed requirement with locale-aware one-time starter initialization.
- `operator-rewards`: same for award seeds.

## Impact

- `internal/store` (migration `00009`, bootstrap metadata, starter catalog definitions, `Open` options).
- `internal/bootstrap` (pass `admin.time_locale` when opening the store).
- Store/bootstrap tests; `CHANGELOG.md` Unreleased bullet.
