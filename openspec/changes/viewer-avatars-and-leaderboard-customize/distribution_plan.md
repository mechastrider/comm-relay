# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing zip | Existing policy | Audience portraits, custom upload, OBS leaderboard title/cap |
| macOS universal | Existing zip | Existing policy | Same in browser + overlay |
| Linux amd64 | Existing tar.gz | Existing policy | Same |
| Headless | `go build ./cmd/comm-relay-server` | Not signed | Upload API + cache file on disk + `/overlay/assets/` |

No new binary or installer.

## Build Reproducibility and Provenance

Existing Go/Wails/web embed. CI: `go test ./...`, golangci-lint, ESLint/i18n, OpenSpec validate. No extra native libraries.

## Install / Upgrade / Downgrade / Uninstall

- Upgrade runs Goose and starts caching avatars from new chat lines (historical identities without a new message stay uncached until they speak or a custom file is uploaded).
- Default leaderboard length becomes 5 unless the operator sets `max_entries`.
- OBS overlay/leaderboard/alert URLs unchanged; reload Browser Sources after upgrade.
- Downgrade: old binary shows up to 20 ranks, ignores title/hide/custom; leftover columns/files are inert.
- Uninstall: delete the config directory (includes DB and `overlay-assets`).

## Update Channels and Compatibility

GitHub releases. Old overlay clients ignore unknown JSON fields. New admin against an old server cannot upload viewer avatars (route missing) — not a supported mix.

## Data Migration and Rollback

See `persistence_schema.md`. Changelog MUST mention backup of `overlay-assets` with the DB and the new default top-5.

## Release Notes and Support

Russian `[Unreleased]`: Audience portraits, custom viewer portrait with disable flag, local avatar cache, leaderboard title, rank cap (default 5), hide from ranking. README/FAQ only if Settings or Audience steps are missing from current docs. Known limitation: Twitch-only faces need a custom upload (no Helix).

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Auto-update protocol, notarization, and installer UI are unchanged.
