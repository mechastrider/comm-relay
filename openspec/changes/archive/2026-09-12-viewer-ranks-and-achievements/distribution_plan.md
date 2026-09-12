# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-vX.Y.Z-windows-amd64.zip` | Existing unsigned early-release policy | Upgrade populated data; Wails Audience Progression; OBS alert/leaderboard; restart/backfill |
| macOS / universal 64-bit | Existing `CommRelay-vX.Y.Z-macos-universal.zip` | Existing unsigned/not-notarized policy | Same upgrade and WebKit admin flow; OBS/browser surfaces when available |
| Linux / amd64 | Existing `CommRelay-vX.Y.Z-linux-amd64.tar.gz` | Existing unsigned policy | Upgrade populated data; compact GTK-WebKit UI; browser/OBS transparency and alert queue |
| Windows, macOS, Linux / supported Go release architecture | Existing headless server build/source run | N/A | `/health`, browser admin, API/WS contracts, SQLite migration/reconciliation, overlay URLs |

No artifact name, archive layout, executable name, embedded web-assets strategy, runtime dependency, or minimum OS target changes.

## Build Reproducibility and Provenance

- Build with the repository-pinned Go/Wails/Node and CI workflow versions. Do not add generated frontend bundles or external runtime assets.
- Keep the SQLite migration embedded and sequential after `00016_viewer_greetings.sql`; record its checksum through the existing migration mechanism.
- Run `go test ./...`, progression concurrency tests with `go test -race` where supported, `golangci-lint run ./...`, `npm ci`, `npm test`, `npm run lint`, strict OpenSpec validation, and repository build workflows from a clean checkout.
- Confirm embedded and `-web ./web` development modes serve identical new markup, locale keys, API routes, and overlay behavior.
- Release provenance, checksums, and Git tag construction remain the existing workflow's responsibility.

## Install / Upgrade / Downgrade / Uninstall

Fresh installs create the progression schema, persist initialization locale, seed catalogs/settings once, and have no historical backfill work. Upgrades from the current release apply the additive migration, retain all existing configuration/history/assets, seed the user-owned catalog once, and reconcile in bounded silent batches while the local service remains usable.

Before upgrade smoke, copy the entire application-data directory. Verify restart during pending locale and mid-reconciliation. No installer prompt, elevated permission, or manual migration step is added.

For downgrade smoke, use a disposable copy of upgraded data with the selected previous release. It must start, read/write its known config and viewer data, and ignore additive SQLite structures. An older config save may omit the unknown `show_viewer_titles` field; the next forward launch safely resolves omission to false. Re-upgrade must preserve progression tables/unlocks and resume reconciliation without duplicate alerts. Downgrade does not attempt to remove schema.

Uninstall and portable-folder deletion behavior remain unchanged. Progression data is removed only when the operator removes the existing application-data/database location.

## Update Channels and Compatibility

The change ships through the existing release channel and single-binary packages. No updater/feed is added. API and WebSocket additions are backward compatible: new reads/actions do not replace old routes, `viewer_progression` is an ignorable new frame type, and `show_viewer_titles` defaults off. Existing pinned/unpinned OBS URLs remain valid and no source reconfiguration is required.

Cross-version concurrent clients are tolerated within the current local trust model: old overlays ignore progression frames; new overlays continue to accept existing alert/leaderboard payloads. Running two server versions against one SQLite file remains unsupported.

## Data Migration and Rollback

- Structural migration is atomic and fast; history scanning is deferred to the resumable reconciler.
- Seed/bootstrap and backfill must not publish production alerts or rewrite source history.
- A migration failure stops normal database startup with actionable diagnostics and leaves the prior schema transaction intact.
- A reconciliation failure leaves committed batches valid, reports degraded status, and retries/resumes without blocking existing chat relay behavior.
- Rollback is operational: restore the copied application-data directory or run the older binary against a disposable upgraded copy. Never down-migrate the operator's only database during release smoke.
- Reinstalling the fixed/newer build resumes by schema version and reconciliation generation; it does not reseed deleted user-owned definitions.

## Release Notes and Support

At implementation completion, add concise Russian `[Unreleased]` bullets covering configurable titles/achievements, Audience Progression, optional leaderboard titles, combined alert celebrations, and silent upgrade backfill. Explain that achievements recognize existing activity but do not grant XP and that the existing alert OBS source is reused.

Support checks should request app version, OS, whether admin is Wails or browser, diagnostics reconciliation status/counters, and whether the affected OBS source is `/overlay/alert` or `/overlay/leaderboard`. Logs must identify migration/bootstrap/reconciliation generation, evaluated live causes, inserted/suppressed unlock counts, and WS delivery/drop counters without secret achievement details or raw messages.

## Authority Boundary

This plan does not authorize signing, notarization, upload, release, deletion of user data, or publication to an update channel.

## Not applicable

Installer creation, auto-update implementation, code-signing identities, notarization entitlements, store submission, native runtime installation, new firewall rules, connector authorization, asset CDN, and cloud migration are not part of this change.
