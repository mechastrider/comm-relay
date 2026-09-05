# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-<version>-windows-amd64.zip` | Existing project release policy | Wails/browser admin XP + Settings activity; OBS leaderboard |
| macOS / universal amd64+arm64 | Existing `CommRelay-<version>-macos-universal.zip` | Existing project release policy | Browser/Wails XP labels and grant |
| Linux / amd64 | Existing `CommRelay-<version>-linux-amd64.tar.gz` | Existing project release policy | Browser/Wails XP labels and grant |
| Developer/headless build | `go build ./cmd/comm-relay-server` | Not signed | `GET /api/leaderboard` `xp`; ingest activity tests |

No new binary, helper, installer, or packaging path.

## Build Reproducibility and Provenance

Use the existing Go version from `go.mod`, Wails version pinned by the release workflow, and embedded `web/` assets. CI must run Go tests, golangci-lint, ESLint/i18n, and OpenSpec validation. Existing source commit, workflow run, checksums, and release tag remain the provenance chain.

## Install / Upgrade / Downgrade / Uninstall

- Install and portable extraction are unchanged.
- Upgrade migrates `comm-relay.db` on first start (`score` → `xp`, activity columns, extra award seeds) and fills activity config defaults.
- OBS Browser Source URLs are unchanged; the leaderboard page must be reloaded (or OBS restarted) so it reads `xp`.
- Downgrade is not schema-compatible. Restore a pre-upgrade copy of the config directory before running an older binary.
- Uninstall remains deleting the install folder and, if desired, the config directory.

## Update Channels and Compatibility

Ships through the existing GitHub release channel. Mixed old admin cache + new server is not supported: the admin must load JS that reads `xp`. Mixed new admin + old server will miss `xp` and activity fields; not a supported installed state.

## Data Migration and Rollback

See `persistence_schema.md`. Release notes MUST tell operators that the database is rewritten and that a backup of the config folder is the rollback path.

## Release Notes and Support

Implementation SHALL add concise Russian `[Unreleased]` bullets: Score is now XP; chat no longer pays per line; silent activity settings; extra award types. README/FAQ change only if Settings or leaderboard instructions still say “очки за сообщение” as the progress rule. `docs/concept.md` and `docs/roadmap.md` phase 6c language update with the XP-only model.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No new package format, auto-update channel, minimum-OS bump, or installer UI.
