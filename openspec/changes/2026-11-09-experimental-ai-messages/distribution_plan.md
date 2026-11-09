# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|---|---|---|---|
| Windows amd64 | Existing desktop ZIP | Existing release policy | Packaged WebView2 admin and OBS |
| macOS universal | Existing desktop artifact | Existing release policy | Intel/Apple Silicon WebKit and OBS |
| Linux amd64 | Existing desktop archive | Existing release policy | WebKitGTK admin and OBS |
| Headless current targets | Existing server binary | Existing release policy | Browser admin and OBS |

## Build Reproducibility and Provenance

No new external runtime, daemon or speech executable. Use existing pinned Go/Node dependencies, embedded admin build and release workflow. Any audio-duration dependency must be Go-native, bounded and license-reviewed. Record exact commit, toolchain and package in implementation evidence.

## Install / Upgrade / Downgrade / Uninstall

Fresh installs and upgrades keep the flag off. Existing data paths and installer behavior remain unchanged. Document environment credential setup for shell and desktop launches; missing variables must be actionable in UI. Disable and backup before downgrade; verify older app behavior without attempting schema rollback. Preserve existing user-data uninstall policy.

## Update Channels and Compatibility

No new update channel or minimum OS. Experimental API/config is explicitly marked as such; imported ordinary packs and existing overlays continue to work when off. Updated server and bundled overlay ship together; old cached overlay clients must reconnect/reload after update before AI is enabled.

## Data Migration and Rollback

Use additive audit migration and default-off config. Rollback switch cancels AI work/playback immediately; preserve configuration for repair. Restore backup only via established operator procedure, never automatically overwrite a newer database.

## Release Notes and Support

This planning PR needs no CHANGELOG entry. Implementation adds Russian Unreleased bullets covering opt-in, external providers, automatic moderation/review, limits and data transmission; documents supported/tested provider-model pairs without claiming every model works. Support evidence includes stage/status/correlation and sanitized provider error, never keys or raw viewer content in general logs.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release. The current request authorizes a design PR only.

## Not applicable

Packaging workflow/signing/update-channel changes are not needed. Packaged smoke remains required because environment inheritance and media playback differ from development servers.
