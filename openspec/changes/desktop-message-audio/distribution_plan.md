# Distribution Plan
## Artifact Matrix
Existing desktop packages and headless server remain unchanged.
## Build Reproducibility and Provenance
Build admin first; embed shared tone source and shell scripts in existing Go binary. Keep pinned Wails v2.16.0.
## Install / Upgrade / Downgrade / Uninstall
No migration or new runtime dependencies.
## Update Channels and Compatibility
No channel changes.
## Data Migration and Rollback
Revert change; config stays compatible.
## Release Notes and Support
Russian Unreleased fix bullet; report ALT Linux and Windows/macOS verification limits.
## Authority Boundary
PR publication is authorized; release/signing/notarization is not requested.
