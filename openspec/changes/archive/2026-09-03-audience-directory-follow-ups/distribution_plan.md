# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-<version>-windows-amd64.zip` | Existing project release policy | Wails admin Audience table |
| macOS / universal amd64+arm64 | Existing `CommRelay-<version>-macos-universal.zip` | Existing project release policy | Wails/browser Audience smoke |
| Linux / amd64 | Existing `CommRelay-<version>-linux-amd64.tar.gz` | Existing project release policy | Wails/browser Audience smoke |
| Developer/headless build | `go build ./cmd/comm-relay-server` | Not signed | `GET /api/viewers` + browser admin |

No new binary, helper, installer, or packaging path.

## Build Reproducibility and Provenance

Use the existing Go version from `go.mod`, Wails version pinned by the release workflow, and embedded `web/` assets. CI must run Go tests, golangci-lint, ESLint/i18n, and OpenSpec validation. Existing source commit, workflow run, checksums, and release tag remain the provenance chain.

## Install / Upgrade / Downgrade / Uninstall

- Install and portable extraction are unchanged.
- Upgrade needs no operator action. Existing viewer SQLite continues to work; `platforms` is derived at read time.
- OBS Browser Source URLs are unchanged.
- Downgrade ignores `platforms`. A newer admin against an older server falls back to last-seen platform.
- Sort preference lives only in that WebView; uninstall/data wipe of the origin removes it.

## Update Channels and Compatibility

Ships through the existing GitHub release channel. Mixed server/client versions are not a supported installed state. A cached admin page against a newer server is safe: extra `platforms` is additive. A newer admin against an older server uses the last-seen fallback.

## Data Migration and Rollback

No SQLite or config migration. Rollback is the prior binary; no database restore. Config-directory backup remains sufficient for viewer data; it does not carry the sort preference.

## Release Notes and Support

Implementation SHALL add concise Russian `[Unreleased]` bullets for Audience platforms, sort, and one-click cards. README/FAQ change only if the table cannot be used from existing Audience instructions.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No new minimum OS, update channel, installer migration, code-signing identity, notarization entitlement, service/daemon, cloud deployment, feature flag, or remote rollback mechanism.
