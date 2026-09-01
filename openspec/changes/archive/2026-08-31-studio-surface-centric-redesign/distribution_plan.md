# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | Existing `CommRelay-<version>-windows-amd64.zip` | Existing unsigned early-release policy | Launch desktop or `/`, open Studio, dismiss/reopen Add to OBS, copy Follow-active chat URL, Publish a theme, activate from Live |
| macOS / universal 64-bit | Existing `CommRelay-<version>-macos-universal.zip` | Existing unsigned/not-notarized policy | Same Studio flows in WebKit; clipboard fallback if needed |
| Linux / amd64 | Existing `CommRelay-<version>-linux-amd64.tar.gz` | Existing unsigned policy | Compact window: inspector scrolls, Publish reachable; copy URL |
| Any / headless Go binary | Existing server binary or `go run ./cmd/comm-relay-server` | N/A | `/health`, `/#studio`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/dock/messages` |

## Build Reproducibility and Provenance

Unchanged Go/Wails pipelines. Studio HTML/CSS/JS and locales MUST ship wherever `web/` is embedded. No Node runtime in the product; `npm ci` is lint/test only. No new production dependency is expected.

## Install / Upgrade / Downgrade / Uninstall

Portable extract-and-run. Upgrade replaces the app; user config directory stays. Static Studio assets ship with the binary so operators do not mix an old admin with a new binary (not required for API compatibility here, but required for the redesigned UI).

Downgrade restores the previous Studio layout. `config.json` and SQLite remain readable. The Add to OBS dismissed key is ignored by old assets. Existing OBS Browser Source URLs (pinned and unpinned) keep working.

Uninstall follows current docs; browser preferences may remain until the profile is cleared.

## Update Channels and Compatibility

No auto-updater. GitHub releases and source builds stay the channels. Minimum OS/WebView/OBS/Go requirements unchanged. Overlay URL query contracts stay additive.

## Data Migration and Rollback

No migration. Rollback is the previous package. In-memory Studio drafts are not recovered. Local preview preferences remain valid.

## Release Notes and Support

Implementation MUST add concise Russian bullets under `CHANGELOG.md` `[Unreleased]` for the streamer-visible Studio IA: adaptive surface selector, Essentials / All settings, resumable OBS setup, layered appearance, and safe Use on stream. Skip implementation trivia.

README and FAQ Studio/OBS copy steps MUST name Add to OBS, Follow-active on the selected surface, pinned URLs in overflow/sheet, and Publish. Do not rewrite unrelated versioned changelog sections.

Support notes:

- Existing `?preset=` OBS sources stay pinned.
- New primary copy omits `preset` and follows the active look.
- Dock URL is in Add to OBS, not the themed surface list.
- Connected browser clients are not OBS scene visibility.
- Advanced still contains the previous appearance fields.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Installers, auto-update feeds, store submissions, signing changes, feature flags, and native mobile packages.
