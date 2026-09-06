# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows / supported release architectures | Existing headless and Wails artifacts | Existing policy, unchanged | Settings, OBS dock toolbar, production leaderboard, restart migration |
| macOS / supported release architectures | Existing headless and Wails artifacts | Existing signing/notary policy, unchanged | Local browser/WebView and OBS when available |
| Linux / supported release architectures | Existing server/desktop archives | Existing policy, unchanged | Local browser and supported OBS package |

## Build Reproducibility and Provenance

Use pinned Go modules, the existing migration embed, and the Node lockfile. No external service, downloaded runtime asset, or OS-specific build dependency is added. Release provenance records the commit and standard Go/JS checks.

## Install / Upgrade / Downgrade / Uninstall

Upgrade applies additive migration 00013 before server start and loads presence-aware config defaults. Existing installs remain always-visible until the operator changes policy; new config files start automatic. Uninstall is unchanged. Before downgrade, support guidance should recommend backing up `config.json` and `comm-relay.db`.

## Update Channels and Compatibility

No channel or minimum-OS change. Existing overlay/dock URLs stay valid. Older clients ignore `leaderboard_visibility`; current clients restore state on connect. Existing commands remain alert actions. Older binaries ignore the new command column and visibility config but cannot execute show-leaderboard actions as intended.

## Data Migration and Rollback

Verify up/down migration in a scratch copy and upgrade from migration 12. Rollback replaces the binary and may drop column 00013 only through the normal migration mechanism when explicitly performed; otherwise the extra column is harmless. Runtime visibility overrides are discarded on either direction.

## Release Notes and Support

Add a concise Russian `[Unreleased]` bullet describing automatic/on-request modes, award/rank triggers, viewer command action, and dock controls. Update README and README.en with policy defaults, upgrade compatibility, the localhost control model, and the difference between application hiding and OBS source-eye visibility. Update `docs/concept.md` because leaderboard operating behavior changes; change roadmap only if future alert-queue coordination is committed.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Readiness Evidence — 2026-09-06

- The headless server built and started on Linux x86_64 with fresh data; health, current dock/leaderboard URLs, migration 1→13, clean shutdown, and restart-reset visibility semantics passed.
- Automated migration tests cover a version-12 database and reversible 00013 down/up behavior.
- Packaged Wails startup on the Windows/macOS matrix and copied-data downgrade using an older binary were not available here, so D.1 remains open for release-environment smoke.

## Not applicable

No installer packaging, signing identity, notarization entitlement, update channel, remote port exposure, OBS plugin, or artifact naming change.
