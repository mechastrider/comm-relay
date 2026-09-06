# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows / supported release architectures | Existing headless and Wails artifacts | Existing policy, unchanged | Admin Studio plus OBS Browser Source rectangles |
| macOS / supported release architectures | Existing headless and Wails artifacts | Existing signing/notary policy, unchanged | Studio/external browser plus OBS when available |
| Linux / supported release architectures | Existing server/desktop archives | Existing policy, unchanged | External browser and supported OBS package |

## Build Reproducibility and Provenance

Use the pinned Go/module state and existing static asset embedding. No generated CSS bundle or new package manager is introduced. Record the commit and normal release checks. JavaScript remains linted through the repository's Node lockfile.

## Install / Upgrade / Downgrade / Uninstall

Installation and uninstall paths are unchanged. Upgrade adds optional JSON fields; no database or asset conversion runs. Downgrade retains readable known fields and ignores new ones, though the old UI/rendering will not honor title modes or responsive sizing.

## Update Channels and Compatibility

No update-channel or minimum-OS change. Follow-active and pinned leaderboard URLs remain valid. Explicit `font_size_px` query URLs retain fixed behavior. Existing presets with a leaderboard-specific font retain fixed sizing; other presets adopt responsive sizing and theme-title fallback.

## Data Migration and Rollback

No formal migration. Recommend backing up the existing config directory as for any release. Rollback is replacement with the prior binary; extra JSON keys are inert. Do not rewrite existing presets on startup or an unchanged Publish.

## Release Notes and Support

Refine the current Russian `[Unreleased]` overlay/leaderboard entry to explain width-driven scale, height-driven complete rows, theme/custom/hidden title behavior, and XP-first rows with optional messages. Update README and README.en OBS sizing instructions and Studio field descriptions. Support troubleshooting should distinguish Browser Source viewport dimensions from OBS scene transform scaling.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No installer layout, signing identity, notarization entitlement, auto-updater, artifact name, release channel, native dependency, or minimum OS changes.
