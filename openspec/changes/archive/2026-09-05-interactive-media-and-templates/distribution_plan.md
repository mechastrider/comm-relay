# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing zip | Existing policy | Catalog upload + OBS `/overlay/alert` |
| macOS universal | Existing zip | Existing policy | Catalog + browser alert |
| Linux amd64 | Existing tar.gz | Existing policy | Catalog + browser alert |
| Headless | `go build ./cmd/comm-relay-server` | Not signed | Upload API + `GET /overlay/assets/` |

No new binary or installer.

## Build Reproducibility and Provenance

Existing Go/Wails/web embed. CI: Go tests, golangci-lint, ESLint/i18n, OpenSpec validate. Any small MP3 duration library must be a Go module, not a shipped ffmpeg.

## Install / Upgrade / Downgrade / Uninstall

- Upgrade adds SQLite columns and reads `streamer_display_name`.
- Operators must copy `overlay-assets` with the DB when backing up.
- OBS alert URL unchanged; reload the Browser Source after upgrade.
- Downgrade loses custom media display; restore backup if columns must match an old binary.
- Uninstall: existing folder deletion.

## Update Channels and Compatibility

GitHub releases. Old overlay clients ignore new alert fields. New admin against old server cannot upload `kind` `alert_sound` (400) — not a supported mix.

## Data Migration and Rollback

See `persistence_schema.md`. Changelog MUST mention backup of the assets folder.

## Release Notes and Support

Russian `[Unreleased]`: streamer name, template variables, custom image/sound on commands and awards, layouts. README/FAQ only if Settings or catalog steps are missing from current docs.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No new package format or auto-update channel.
