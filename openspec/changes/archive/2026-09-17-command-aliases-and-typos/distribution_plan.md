# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Existing server/desktop hosts | Same Go binary + embedded/static `web/` | Unchanged; not requested | `go build ./...`; admin Commands editor; `!heate` match |

No new package layout, installer, or artifact name.

## Build Reproducibility and Provenance

Ordinary `go build` / existing desktop tags. Goose SQL is embedded in `internal/store`. No new native libraries.

## Install / Upgrade / Downgrade / Uninstall

Operators replace application files as for any patch. First launch of the new binary applies Goose `00020`. Downgrade to a previous binary keeps the table unused and restores exact-trigger-only matching. Uninstall remains delete of the data directory.

## Update Channels and Compatibility

No auto-update channel change. Older admin pages against a new server: `DisallowUnknownFields` is on the server decoder, not the client; extra `aliases` in GET responses are ignored by old JS, so list still loads, but old Save posts without `aliases` and **clears** aliases (omitted means empty). Call this out in release notes: save the catalog from a matching UI after upgrade. New UI against an old server will 400 on unknown field `aliases` until the operator upgrades the binary.

## Data Migration and Rollback

Empty `command_aliases` after Up. Rollback: revert binary; aliases stop matching; rows remain for a later upgrade. No installer rollback script.

## Release Notes and Support

Streamer-visible `[Unreleased]` Russian bullets: extra names per command, and unique one-letter typos on long triggers. Mention that short `!gg` / `!hi` do not typo-match.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Installer, portable zip layout, code signing, notarization, auto-update channels, minimum-OS bump, artifact renaming.
