# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-<version>-windows-amd64.zip` desktop package | Existing unsigned early-release policy; no new signing authority | Launch Wails/WebView2, load all workspaces, activate a preset, copy an unpinned URL, open it in OBS/browser |
| macOS / universal 64-bit | Existing `CommRelay-<version>-macos-universal.zip` application bundle | Existing unsigned/not-notarized policy; no new signing authority | Context-menu launch, load shell in WebKit, verify navigation, Publish/Save, clipboard fallback |
| Linux / amd64 | Existing `CommRelay-<version>-linux-amd64.tar.gz` desktop package | Existing unsigned policy | Launch with documented GTK/WebKit runtime, verify compact window and browser/OBS URL behavior |
| Windows, macOS, Linux / supported Go architectures | Existing headless server binary or source build | N/A | Run with external `web/`, verify `/health`, `/`, API activation, `/overlay`, `/leaderboard`, and `/dock/messages` |

## Build Reproducibility and Provenance

The current Go and Wails build workflows remain authoritative. Static admin CSS, JavaScript, locale data, and HTML must be included anywhere the existing `web` tree is embedded or packaged. No Node runtime or frontend bundle is introduced; `npm ci` installs lint tooling only. Dependency manifests change only if implementation demonstrates a necessary testing dependency, which is not expected.

Release CI continues building from a version tag with the repository-pinned Go/module inputs and existing platform runners. Before packaging, CI or the release operator runs Go tests, golangci-lint, web lint, and the browser smoke set defined in `qa_plan.md`. Generated archives keep their current naming and directory layout.

## Install / Upgrade / Downgrade / Uninstall

Installation remains portable/extract-and-run. Upgrading replaces the application binary/bundle while retaining the OS user config directory. The redesigned static assets ship with the same binary, preventing a supported package from pairing a new activation route with an old admin or vice versa.

Downgrade replaces the application with an earlier build. No data conversion is needed because configuration and SQLite schemas do not change. Existing pinned and unpinned OBS URLs continue to resolve under both versions. Uninstall and optional removal of user data follow current documentation.

## Update Channels and Compatibility

No automatic updater or new channel is added. GitHub release artifacts and manual/source builds remain the distribution paths. Minimum OS, WebView2, GTK/WebKit, OBS, browser, and Go requirements remain unchanged.

The new admin expects `POST /api/overlay/activate`, so mixed-version loose `web/` assets are unsupported. Headless development must use the matching repository `web` directory. Public mutation conventions remain additive: older external clients can continue using `POST /api/config/update`; the new route does not remove or reinterpret an existing route.

## Data Migration and Rollback

There is no migration, backfill, or database version change. Before a release smoke test, representative current data may be backed up using existing config-directory guidance. Rollback restores the earlier application package; `config.json`, `comm-relay.db`, and overlay assets remain readable. In-memory Studio/Settings drafts are intentionally not recoverable across upgrade or rollback.

## Release Notes and Support

Implementation must add concise Russian bullets under `CHANGELOG.md` `[Unreleased]` covering the new console navigation, explicit hot/Publish/Save behavior, and default Follow active preset source URLs with pinned compatibility. README screenshots or setup text are updated only where the actual source-copy workflow changes.

Support notes must tell operators that:

- existing OBS sources containing `preset` stay pinned;
- newly copied default overlay/leaderboard URLs follow the active preset;
- connected browser clients are not proof that a source is visible in an OBS scene;
- commands, splash messages, and OBS scene control are not part of this release.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Installers, auto-update feeds, staged rollout cohorts, feature flags, data migration tools, signing/notarization changes, store submissions, and native mobile packages are not part of this change.
