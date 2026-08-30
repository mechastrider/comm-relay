# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows amd64 | Existing desktop zip/exe + server zip | Out of scope | Open admin Audience; OBS `/overlay/alert` |
| Linux amd64 | Existing tarball + `.desktop` (unchanged) | Out of scope | Same |
| macOS amd64/arm64 | Existing app/server artifacts | Out of scope | Same |

No new package flavor, installer key, or auto-update channel.

## Build Reproducibility and Provenance

Same Go module and static `web/` tree. New files: Goose `00002`, `web/alert/`. `go build ./...` and desktop `-tags wails` remain. No CGO still.

## Install / Upgrade / Downgrade / Uninstall

Upgrade: replace binary; first start runs Goose Up on existing `comm-relay.db` and fills `hide_command_messages` if missing. Operator must add a new OBS Browser Source for `/overlay/alert` (document in README).

Downgrade: previous binary serves without commands/alerts; new tables remain unused; JSON key ignored.

Uninstall: no extra paths beyond the existing config directory.

## Update Channels and Compatibility

Requires 6a schema (`00001`) already present. If a user skips 6a (no DB), bootstrap still creates DB and applies all migrations. Minimum OS unchanged. Overlay theme contract: alert is a new surface — old presets keep working.

## Data Migration and Rollback

See `persistence_schema.md`. Rollback is previous binary + optional DB restore from backup. Deleting seed commands is not restored by downgrade.

## Release Notes and Support

CHANGELOG `[Unreleased]` Russian bullets: commands, `/overlay/alert`, Reward in admin/dock, hide command lines, seeds. README RU/EN: Alerts URL, enable audio in OBS, dock Reward. Update `docs/roadmap.md` phase 6b as implemented-when-shipped (on archive). FAQ: sounds play in the alert source.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

New installers, code signing, Sparkle/MSI, store listings.
