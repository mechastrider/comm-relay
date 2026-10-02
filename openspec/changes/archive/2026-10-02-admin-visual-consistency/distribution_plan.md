# Distribution Plan
## Artifact Matrix
Existing server and Wails desktop packages embed the rebuilt admin assets. No OS/architecture or signing changes.
## Build Reproducibility and Provenance
npm ci; npm run build; then Go build/checks. Retain lockfile dependency versions.
## Install / Upgrade / Downgrade / Uninstall
Unchanged; no migration.
## Update Channels and Compatibility
Unchanged.
## Data Migration and Rollback
No data migration. Revert frontend commit and rebuild to roll back.
## Release Notes and Support
Russian Unreleased note describing consistent controls and grouped editors.
## Authority Boundary
This plan does not authorize signing, notarization, upload, or release.
## Not applicable
Installer/update/signing changes are not needed. Native packaged smoke is a release-host check if unavailable here.
