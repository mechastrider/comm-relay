# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-vX.Y.Z-windows-amd64.zip` containing `CommRelay.exe` | Preserve current release-workflow signing status; this change adds no certificate or signing step | Launch desktop against an upgraded copy of user data, open Live/Studio, load `/overlay/recap` in OBS Browser Source, Show/Hide, restart hidden |
| macOS / universal | Existing `CommRelay-vX.Y.Z-macos-universal.zip` containing `CommRelay.app` | Preserve current signing/notary status; no entitlement changes | Same desktop and local Browser Source flow on both packaged architectures represented by the universal build |
| Linux / amd64 | Existing `CommRelay-vX.Y.Z-linux-amd64.tar.gz` with `CommRelay`, desktop file, icon, and install helper | Not applicable under the existing workflow | Launch from extracted archive, verify admin/recap route and OBS Browser Source with a supported OBS package |
| Developer/headless builds | Existing `go build ./cmd/comm-relay-server` or repository `-web ./web` flow | Not published by this plan | Verify `/health`, admin history, static recap route, production `/ws`, and sample preview |

No new installer, sidecar, runtime dependency, database service, or separately downloaded web bundle is introduced. The recap page and its theme assets are embedded through the same mechanism as existing admin/overlay assets.

## Build Reproducibility and Provenance

- Keep the existing Go/Wails version pins, release workflow matrix, tag/version validation, checksums/provenance behavior, and clean `wails build` process unchanged.
- Ensure `web/recap` and any shared recap modules/locales are included by the current embed patterns. Add a build or route test that fails if the packaged binary omits the recap document or assets.
- The release inputs remain tracked Go source, migrations, `config.json` defaults/types, web assets, and documentation. Snapshot examples used by Studio are deterministic static data and do not require network generation.
- Run the repository's ordinary quality gates before packaging: `go test ./...`, targeted race tests, `golangci-lint run ./...`, `npm ci`, and `npm run lint`. Release workflow behavior must remain reproducible without a pre-existing local database.
- Inspect each produced archive using the existing artifact naming and directory layout. Do not add environment-specific data, local `config.json`, SQLite files, or generated recap snapshots.

## Install / Upgrade / Downgrade / Uninstall

- Fresh install creates the existing local database/config through normal startup; migration `00019` produces empty attribution/snapshot structures and recap visibility starts hidden.
- Upgrade remains replace-the-application-files while preserving the external user data directory. First upgraded start applies the additive migration and conservative attribution backfill before serving recap APIs.
- The new OBS surface is opt-in setup: upgrades do not modify scenes or display a recap. Operators add `/overlay/recap` as a separate canvas-sized Browser Source when ready.
- Existing chat, leaderboard, alert, admin, and dock URLs/config remain valid. An omitted `surfaces.recap` resolves theme defaults without writing the file.
- Binary downgrade without schema downgrade is expected to ignore additive columns/tables and optional JSON keys under existing compatibility rules. An explicit Goose down removes recap snapshots/attribution and is data-losing only for those new fields; operators should back up the data directory first.
- Uninstall remains unchanged. Removing application files does not silently remove external user data; any existing platform-specific cleanup guidance still applies.

## Update Channels and Compatibility

- Use the existing GitHub Releases/tag channel and prerelease convention. No auto-update channel, staged rollout mechanism, forced update, or network call is added.
- Minimum OS, architecture, WebView, Go runtime for source builds, and OBS support claims remain unchanged.
- HTTP additions are backward compatible: reads use new paths and mutations use new POST actions. Existing clients ignore the new WebSocket `stream_recap_state` type and preserve their current behavior.
- A new binary with an old config/database is supported through default resolution and migration. Old binaries cannot show recap and are not expected to interpret the new state frame or snapshot format.
- Snapshot payloads carry an explicit version. The shipping reader must accept version 1 exactly and fail safely on unsupported future versions.
- No connector protocol, OAuth scope, platform API, or cross-platform chat normalization version changes.

## Data Migration and Rollback

- Back up a representative pre-`00019` data directory before release smoke tests. Verify first launch, unambiguous and ambiguous legacy attribution, foreign keys, session-history reads, and unchanged existing viewer totals.
- Migration failure is a startup/blocking support event; the application must not serve a partially migrated recap API. Support guidance should ask users to preserve the database/logs and restore the backup rather than delete their data.
- Rollback preference is to stop the new binary and run the previous package against the unchanged additive database only after compatibility smoke tests. It will ignore recap data and start without any recap visibility.
- If an explicit schema down is necessary, disclose that immutable recap snapshots and session-attribution columns are removed. Existing sessions, viewer aggregates, interaction facts, and unlock facts remain.
- Reinstalling/upgrading forward after a binary-only rollback preserves the stored snapshots. Re-upgrading after schema down can only reconstruct conservative attribution; exact deleted recap snapshots are not recoverable.

## Release Notes and Support

- Add concise Russian bullets under `CHANGELOG.md` `[Unreleased]` describing the manual full-screen recap, dedicated OBS URL, no automatic session reset, and compact session history.
- Update Russian and English OBS/setup documentation to explain that Recap is a separate full-canvas source, how follow-active versus pinned URLs behave, and that Show captures the session result permanently without ending the session.
- Mention upgrade migration/backfill as automatic and conservative; avoid promising complete attribution for ambiguous old records.
- Support checklist: confirm application version, recap URL/preset, Browser Source dimensions/z-order, hidden/visible API state, current session id, migration success, WebSocket-drop diagnostics, and whether a process restart intentionally hid the recap.
- Do not present historical replay, automatic stream-end detection, snapshot replacement, or MVP grants as included.

## Authority Boundary

This plan does not authorize signing, notarization, upload, release, tag creation, publication, or modification of a user's OBS scenes or production data. Those remain explicit maintainer/operator actions after implementation and verification.

## Not applicable

New package formats, installers, auto-updaters, update servers, release channels, minimum-OS changes, native permissions/entitlements, notarization design, container images, database services, and cloud rollout are not required for this change.
