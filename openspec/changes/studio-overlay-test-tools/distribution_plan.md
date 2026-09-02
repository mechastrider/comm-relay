# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows x86-64 | Existing Wails desktop executable/package and headless server artifact | Existing project release policy; no new entitlement | Studio test mode plus chat, leaderboard, and alert test URLs in OBS Browser Source |
| Linux existing targets | Existing headless/desktop artifacts where currently built | Existing project policy | Browser Studio and local overlay test URLs |
| macOS existing targets | Existing desktop/headless artifacts where currently built | Existing project policy | Browser Studio and local overlay test URLs |

## Build Reproducibility and Provenance

The feature ships inside the existing Go binaries and embedded static web assets. It introduces no generated bundle, runtime download, external service, native library, or package-manager dependency. Normal pinned Go modules, `package-lock.json`, repository revision, and existing release automation remain the provenance sources. CI/release builds must include the updated `web/` assets exactly as other admin and overlay assets are included today.

## Install / Upgrade / Downgrade / Uninstall

Upgrade replaces the existing executable/package only. There is no installer action, filesystem layout change, first-run migration, browser-storage key, or new permission. Existing production OBS URLs continue to work unchanged. Downgrade makes `/overlay/test/chat`, `/overlay/test/leaderboard`, `/overlay/test/alert`, and `/ws/overlay-debug` return 404; saved test URLs therefore fail closed and cannot expose live content. Uninstall cleanup remains unchanged.

## Update Channels and Compatibility

No new update channel or minimum OS is introduced. Normal overlay routes and public production `/ws` behavior remain unchanged. `debug_reset` and synthetic frames are sent only through the dedicated debug WebSocket. A newer Studio requires a server version containing the dedicated test routes, and 404/offline failures use the defined retry UI rather than silently falling back to production data.

## Data Migration and Rollback

No data migration is required. Rollback consists of reverting the local debug API/channel, dedicated test routes, Studio controls, and overlay layout changes together. Because no debug state is durable and no production schema changes, rollback does not require data conversion or cleanup. The alert CSS rollback may restore the prior narrow maximum width but does not affect stored presets.

## Release Notes and Support

Add concise Russian bullets under `CHANGELOG.md` `[Unreleased]` covering Studio-triggered test scenarios, test-only OBS URLs, familiar icon actions, and overlays fitting the Browser Source rectangle. Support guidance should distinguish static appearance preview, isolated test sources, and production sources; it should note that the OBS source is the final sound/autoplay check.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

New installers, artifact names, code signing identities, notarization profiles, auto-update feeds, staged rollout infrastructure, native dependencies, and minimum-OS changes are not applicable.
