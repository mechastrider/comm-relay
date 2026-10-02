# Distribution Plan
## Build Reproducibility and Provenance
Use npm ci, npm run build before building Go's embedded admin. Existing lockfile and single-binary artifacts apply.
## Install / Upgrade / Downgrade / Uninstall
No installer, minimum OS or updater changes. Existing data is compatible with previous code.
## Update Channels and Compatibility
No channel change.
## Data Migration and Rollback
Migration 00022 adds only a non-unique lookup index. Rollback can drop it through its Down migration without data loss; old migration runners may require downgrade to 00021 before startup. Rebuild frontend/server for application rollback.
## Release Notes and Support
Add concise Russian Unreleased notes describing operator-visible repairs.
## Authority Boundary
No signing, notarization or release publication requested.
## Not applicable
Artifact matrix and signing changes are not applicable to this admin/read-performance fix. Native packaged smoke cannot be claimed from Chromium.
