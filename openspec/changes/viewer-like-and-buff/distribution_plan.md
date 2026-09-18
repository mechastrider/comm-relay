# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Existing Windows desktop | Current Wails artifact | Unchanged | Admin Commands/Settings + overlay chat freeze |
| Existing Linux/macOS if already shipped | Current tarball/binary | Unchanged | Same HTTP app |
| Headless server | `comm-relay-server` | Unchanged | `go test` + ingest fixtures |

No new artifact name, installer layout, or architecture.

## Build Reproducibility and Provenance

Ordinary `go build` / existing desktop build. Static `web/` assets remain embedded or served as today. No new native libraries.

## Install / Upgrade / Downgrade / Uninstall

Operators replace the binary as for any patch. First start runs Goose migration and additive config defaults, then social-catalog bootstrap. Uninstall remains deleting the data directory.

Downgrade: previous binary may not understand `action` `like`/`buff` or `kind` `buff`. Document disabling/deleting those commands before downgrade if the older version refuses to open the DB.

## Update Channels and Compatibility

No auto-update channel change. Overlay and admin MUST ship together so `rejected` chrome matches the server. Older overlay ignores unknown `status` and still shows chat.

## Data Migration and Rollback

SQLite additive migration; config keys default-filled. Rollback of behavior: disable like/buff commands. XP already granted is not reversed. This plan does not authorize a release upload.

## Release Notes and Support

Streamer-visible `[Unreleased]` changelog (RU) when this ships: viewers can `!like` and `!buff` with quotas and caps. FAQ/README only if install/setup steps change (they should not).

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

New installer, portable layout, signing, notarization, auto-update feeds, artifact rename.
