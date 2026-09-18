# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Existing server/desktop hosts | Same Go binary + embedded/static `web/` | Unchanged; not requested | `go build ./...`; dock Like + Reward; grant `on_point`; restart after delete |

No new package layout, installer, or artifact name.

## Build Reproducibility and Provenance

Ordinary `go build` / existing desktop tags. Catalog seeds live in `internal/store` Go. No new native libraries.

## Install / Upgrade / Downgrade / Uninstall

Operators replace application files as for any patch. First launch of the new binary runs on-point catalog initialization. Downgrade to a previous binary leaves `on_point` / `achievement_on_point` unused in the catalog; picker and Live still list unknown awards if the old UI already listed all types. Uninstall remains delete of the data directory.

## Update Channels and Compatibility

No auto-update channel change. Old UI against a new server: Reward picker still lists every award including `like` and `on_point`; Streamer Like icon is absent; grant API unchanged. New UI against an old server: Like still posts `award_id` `like` (works if that seed exists); `on_point` is missing until the operator upgrades so bootstrap can insert it.

## Data Migration and Rollback

No Goose schema. Rollback: revert binary; rows remain; Like icon disappears with the old JS. No installer rollback script.

## Release Notes and Support

Streamer-visible `[Unreleased]` Russian bullets: award «В точку» (+20), achievement «Синхрон» (10×), thumbs-up Streamer Like on Live/dock, Reward picker without duplicate like, dock row no longer jumps after a grant.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Installer, portable zip layout, code signing, notarization, auto-update channels, minimum-OS bump, artifact renaming.
