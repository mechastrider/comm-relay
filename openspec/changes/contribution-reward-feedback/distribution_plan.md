# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-<version>-windows-amd64.zip` with `CommRelay.exe` | Existing project release policy; no new requirement | Wails admin, OBS CEF chat/leaderboard/alert, config upgrade/rollback |
| macOS / universal amd64+arm64 | Existing `CommRelay-<version>-macos-universal.zip` with `.app` | Existing project release policy; no new entitlement | Wails admin and browser smoke; OBS smoke when available |
| Linux / amd64 | Existing `CommRelay-<version>-linux-amd64.tar.gz` | Existing project release policy | Wails/admin in supported WebKit runtime; OBS Browser Source and dock availability as documented |
| Developer/headless build | `go build ./cmd/comm-relay-server` | Not signed | HTTP/API/WebSocket and browser-based overlay smoke |

No new binary, helper, asset bundle, installer, database file, or packaging path is introduced.

## Build Reproducibility and Provenance

Use the existing Go version from `go.mod`, Wails version pinned by the release workflow, embedded `web/` assets, version ldflags, and GitHub Actions runners. The change adds no network-fetched runtime asset and no generated media. CI must run Go tests, golangci-lint, ESLint/i18n checks, and OpenSpec validation before release packaging. Existing source commit, workflow run, checksums, and release tag remain the provenance chain.

## Install / Upgrade / Downgrade / Uninstall

- Install and portable extraction behavior are unchanged.
- Upgrade loads legacy presets without per-surface opacity with no user action. Non-cockpit presets resolve all three surfaces from shared `style.panel_opacity`; cockpit presets whose shared zero was historically ignored retain their former theme glass until an explicit surface edit.
- Existing OBS Browser Source and dock URLs remain valid. Users do not recreate sources.
- Downgrade ignores additive surface fields and uses the retained shared opacity. New award/WebSocket fields are transient and leave no downgrade state.
- Uninstall and removal of the existing config directory remain unchanged.

## Update Channels and Compatibility

The change ships through the existing GitHub release channel with no staged service rollout or auto-update protocol change. `POST /api/awards/grant` remains compatible for callers that omit message context. Existing WebSocket clients ignore optional fields. Current preset ids, themes, query parameters, commands, awards, score, and SQLite data remain compatible.

Because the web assets and Go server ship in one application bundle, mixed server/client versions are not a supported installed state. A separately cached/reloaded OBS source may briefly run older JavaScript against the newer server; optional event fields and unchanged routes make that safe until the source reloads.

## Data Migration and Rollback

There is no SQLite migration. Config format growth is additive and uses runtime fallback rather than eager rewrite. Before a release smoke, test copies of both a normal legacy preset with custom shared opacity and every legacy cockpit theme with shared zero, then verify explicit per-surface zero and nonzero values. Rollback consists of restoring the prior binary; no database restore is required. Normal config backup remains recommended before any version change.

## Release Notes and Support

Implementation SHALL update `CHANGELOG.md` under `[Unreleased]` with concise Russian streamer-facing bullets covering contextual reward feedback, award-priority alerts, live admin rankings, and independent overlay opacity. README/FAQ changes are needed only if the Studio control or OBS behavior requires new operator instructions; URLs and installation steps do not change.

Support diagnostics must not include message quotes. Troubleshooting may ask the operator to use sample preview, browser developer console, current config without secrets, and OBS source dimensions/theme, but not to submit private chat text unnecessarily.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No new minimum OS, update channel, installer migration, code-signing identity, notarization entitlement, service/daemon, cloud deployment, feature flag, or remote rollback mechanism is required.
