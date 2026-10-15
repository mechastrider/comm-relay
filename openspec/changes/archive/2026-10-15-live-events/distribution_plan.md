# Distribution Plan
## Artifact Matrix
Existing server and desktop artifacts unchanged.
## Build Reproducibility and Provenance
Use npm ci/build before Go embeds admin; existing lockfile and module versions.
## Install / Upgrade / Downgrade / Uninstall
Existing installer behavior; migration 00026 applies through normal bootstrap.
## Update Channels and Compatibility
No channel or minimum OS change. API is additive.
## Data Migration and Rollback
See persistence_schema.md. Backup database before downgrade.
## Release Notes and Support
Russian Unreleased entry for Events tab and legacy history limitation.
## Authority Boundary
User authorized a PR, not a release. No signing, publishing or merging.
## Not applicable
Release packaging/signing changes are unnecessary for this feature PR.
