# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-vX.Y.Z-windows-amd64.zip` | Existing unsigned-project policy; no change | Upgrade a populated database, open Audience History in Wails, page global/viewer results |
| macOS / universal 64-bit | Existing `CommRelay-vX.Y.Z-macos-universal.zip` | Existing unsigned/not-notarized policy; no entitlement change | Same migration and Wails history smoke |
| Linux / amd64 | Existing `CommRelay-vX.Y.Z-linux-amd64.tar.gz` | Existing policy; no desktop-entry change | Same migration and Wails history smoke on packaged WebKit runtime |
| Headless server / supported development OS | Existing server build | Not applicable | Read first and next API pages from a migrated database |

## Build Reproducibility and Provenance

Use the existing Go/Wails source build and release workflow without dependency, artifact-name, linker-flag, or packaging changes. The static admin assets remain embedded through the current build path. CI must build from the committed migration and generated-free source; this change introduces no downloaded runtime asset, generated schema, external service, or platform-specific binary dependency.

## Install / Upgrade / Downgrade / Uninstall

Installation remains archive extraction. On first launch of the new version, the existing startup path migrates `comm-relay.db` before serving HTTP. Operators do not configure the feature and do not move data. Upgrade preserves all XP and event rows while backfilling display names for existing award events.

For downgrade, stop CommRelay before replacing the binary. A previous binary can read the database with the additive column and indexes present because its queries name columns explicitly. If the migration is intentionally rolled down, only captured reward-name snapshots are lost; award ids, event timestamps, and XP remain. Uninstall behavior and user-data retention are unchanged.

## Update Channels and Compatibility

No auto-update channel or compatibility handshake is added. The new endpoint and UI ship in the same binary, which is the supported pairing. The API is additive, so older admin clients ignore it. A newer admin served against an older process receives 404 and shows its bounded history error/retry state without breaking other Audience views.

Minimum OS, WebView/WebKit requirements, ports, and connector compatibility remain unchanged. Twitch, YouTube Live, and VK Live awards share the same history model.

## Data Migration and Rollback

- Verify migration from schema 13 with populated, renamed, and deleted award types before release.
- Preserve a copy of the user data directory for manual rollback testing; no automatic backup is introduced.
- Confirm a downgraded previous binary starts and existing viewer/leaderboard behavior is intact with the additive schema.
- Do not publish a release if migration tests, atomic-grant failure tests, or packaged Wails history smoke fail.

## Release Notes and Support

Add concise Russian `[Unreleased]` bullets describing the new channel-wide and per-viewer award journal. Mention that existing history uses the current award name where recoverable and an id fallback for already deleted award types only if this limitation is user-relevant in release notes. README setup and OBS instructions do not change.

Support diagnostics should log migration/query failures and failed grant transactions with existing contextual logging, without logging viewer history payloads or secrets. The UI should report a short retryable local error.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No installer layout, artifact name, dependency installation, code-signing identity, notarization entitlement, update feed, release channel, OBS source, Linux desktop entry, or README setup procedure changes.
