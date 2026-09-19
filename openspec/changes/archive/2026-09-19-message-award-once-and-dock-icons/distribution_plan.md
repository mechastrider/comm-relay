# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Existing server/desktop hosts | Same Go binary + static `web/` | Unchanged; not requested | `go build ./...`; dock icons; duplicate Like 409; check/snowflake chrome |

No new package layout, installer, or artifact name.

## Build Reproducibility and Provenance

Ordinary `go build` / existing desktop tags. Uniqueness lives in `internal/store` + `internal/api`. Icons in `web/shared` and `web/dock`. No new native libraries.

## Install / Upgrade / Downgrade / Uninstall

Operators replace application files as for any patch. First launch uses existing SQLite with no migration. Downgrade to a previous binary allows duplicate grants again and restores labeled dock Reward/Delete. Uninstall remains delete of the data directory.

## Update Channels and Compatibility

No auto-update channel change. Old UI against a new server: labeled buttons still grant; second same-type grant 409s (old UI may show generic grant-failed unless it already handles 409). New UI against an old server: icons work; uniqueness is absent so duplicates still commit until the server is upgraded.

## Data Migration and Rollback

No Goose schema. Rollback: revert binary; history rows remain; extra `granted_award_ids` ignored by old clients.

## Release Notes and Support

Streamer-visible `[Unreleased]` Russian bullets: same award type cannot be granted twice on one chat line; dock Reward/Delete are icons; accepted commands show a checkmark and frozen commands a snowflake with the short reason or countdown.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Installer, portable zip layout, code signing, notarization, auto-update channels, minimum-OS bump, artifact renaming.
