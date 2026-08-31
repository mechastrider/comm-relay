# Persistence Schema

## State Inventory

| Store | Data/owner | Location/portability | Format/schema | Sensitivity |
|-------|------------|----------------------|---------------|-------------|
| `config.json` | Overlay presets, `active_preset_id`, connectors, secrets; config store | Unchanged (exe-adjacent or user config dir) | Existing JSON; no field added or removed | Secrets stay server-side; public API omits them |
| `comm-relay.db` | Viewers/stats; viewer store | Beside config | Existing Goose schema | Local identity data; untouched |
| overlay asset files | Panel images | Existing asset directory | Existing validated image types | Operator media; upload path unchanged |
| browser memory | Studio draft/baseline, dirty flag, selected surface while the document is open | Per loaded document | JavaScript only | Public overlay draft; no secrets |
| browser preference storage | Preview mode/surface/backdrop/size (existing `commRelay.overlayPreview.*` keys); OBS setup outcome; Studio density mode and wide-rail collapse | Browser/webview profile; not portable across browsers | String flags | Non-secret UI preferences |

## Changed Structures / Formats

`config.json` and SQLite do not change. `message_ttl_seconds` stays an integer; duration chips are a UI mapping onto 8, 20, and 0.

The OBS setup preference stores `unseen`, `seen`, `skipped`, or `completed`; missing and invalid values mean unseen. A legacy truthy `commRelay.studio.addToObsDismissed` value maps to completed so an upgrade does not interrupt an existing operator. Studio density stores `essentials` or `all`; rail collapse stores a boolean string. Invalid density/collapse values use expanded Essentials defaults. Existing overlay preview keys keep their names and meaning; `overlayPreview.surface` remains the selected on-stream surface (`chat` / `leaderboard` / `alerts`).

Studio drafts stay in memory until Publish. This change MUST NOT write overlay drafts, presets, or secrets to localStorage.

## Atomicity / Concurrency / Locking

Publish and activate keep today's server locking and atomic `config.json` write. Two admin clients: Live activate in one and Studio Publish in another follow existing compose-from-latest-public-config behavior. Preference writes are last-write-wins per webview and MUST NOT block Publish.

## Encryption / Secret Storage / Privacy

Unchanged. No secret, full config snapshot, or chat history in localStorage.

## Migration / Downgrade / Backup / Export

No server-data migration. The client lazily interprets the legacy dismissed flag as completed. Downgrading the binary ignores the newer UI keys and restores the old Studio layout; overlay data remains compatible. Backup remains copy of the config directory. Clearing site/webview data re-shows OBS setup; that is intended.

## Corruption Recovery / Cleanup / Uninstall

Invalid preview, setup, mode, or collapse values fall back to defaults (sample mode, chat surface, auto-open OBS setup, Essentials, expanded rail) without rewriting `config.json`. Uninstall does not need to delete browser preferences.

## Verification

- Publish a theme change and confirm only overlay fields in `config.json` that the operator edited have changed, plus existing write metadata if any.
- Activate from Live and from Studio Use on stream; only `overlay.active_preset_id` changes on disk.
- Dismiss Add to OBS, reload `/#studio` in the same profile: sheet stays closed; reopen control still works.
- Deny storage: Studio still loads; Add to OBS auto-opens; preview still works.

## Not applicable

Goose migrations, secret encryption changes, and config-directory relocation.
