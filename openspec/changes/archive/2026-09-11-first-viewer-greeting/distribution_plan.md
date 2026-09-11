# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | `CommRelay-vX.Y.Z-windows-amd64.zip` | Existing unsigned early-release policy | Upgrade populated data, edit/test greetings, receive Twitch/YouTube/VK-equivalent synthetic identified messages, render `/overlay/alert` |
| macOS / universal 64-bit | `CommRelay-vX.Y.Z-macos-universal.zip` | Existing unsigned/not-notarized policy | Launch via documented Open flow, migrate data, edit/test greeting, render alert |
| Linux / amd64 | `CommRelay-vX.Y.Z-linux-amd64.tar.gz` | Existing package/checksum policy | Portable launch, migrate data, edit/test greeting, render alert; confirm desktop entry remains unchanged |
| Headless server / supported build host | Existing server binary/build | N/A | HTTP catalog/update/preview, production/debug WebSocket isolation, SQLite restart persistence |

No artifact name, archive layout, executable name, native library, or runtime dependency changes.

## Build Reproducibility and Provenance

Use the existing pinned Go module graph, Node lockfile, Wails build configuration, release workflow, checksums, and source revision metadata. The migration and embedded web assets must be included in every server and desktop build. CI must run the same Go, web lint/i18n, and platform build gates already used for releases; this change introduces no downloaded runtime asset or code generator.

## Install / Upgrade / Downgrade / Uninstall

Fresh installs create two disabled localized definitions. Upgrade runs the additive SQLite migration before serving chat, conservatively marks existing viewers/current-session participants as already seen, and leaves both greetings disabled. Portable and installed desktop layouts continue using the current data directory rules.

Downgrading the executable leaves additive table/columns and assets in place; an older binary ignores them. Re-upgrade must retain definition edits, exclusions, and markers. Uninstall and manual data removal remain unchanged. No automatic deletion of uploaded greeting assets occurs outside the shared unreferenced-asset path.

## Update Channels and Compatibility

The feature ships through the existing GitHub release channel with no protocol negotiation requirement. Older overlay/admin static files embedded in an older binary never receive `source: greeting`. New alert clients retain existing fallback handling for unknown sources, but same-version server/client packaging is the supported case. Twitch, YouTube Live, and VK Live require no connector or OAuth migration.

## Data Migration and Rollback

Before release, test migration against a copy of a populated viewer database with an open session and referenced catalog media. Confirm startup is atomic: migration failure prevents partial service rather than running with missing reserved definitions. Preserve the user's database and overlay-assets directory for rollback. Rollback instructions are: stop CommRelay, restore the pre-upgrade data backup if an older binary cannot open the migrated database in the target SQLite/runtime combination, then launch the previous binary. Do not promise that disabling greetings reverses schema changes; it only stops behavior.

## Release Notes and Support

Implementation must add concise Russian `[Unreleased]` bullets explaining:

- independently configurable first-ever and per-stream greetings under Audience;
- both greetings start disabled and use the existing alert OBS source;
- `New stream` defines returning-viewer reset and viewer cards can exclude bots/accounts.

Support diagnostics should expose greeting fires and bounded suppression reasons so reports can distinguish disabled/excluded/command-line qualification from alert delivery drops. Troubleshooting must ask for app version, whether `New stream` was confirmed, greeting enabled states, viewer exclusion, and pipeline diagnostics without collecting message contents.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No installer, auto-updater, release channel, minimum OS, code-signing identity, notarization credential, store submission, server deployment, or cloud rollback change.
