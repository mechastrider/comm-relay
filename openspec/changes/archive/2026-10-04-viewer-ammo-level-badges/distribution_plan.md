# Distribution Plan

## Artifact Matrix

Existing server and desktop artifacts and signing policies remain unchanged. Browser and Windows Edge smoke cover the edited web surfaces; native package launch is not changed.

## Build Reproducibility and Provenance

Use existing lockfile with npm ci and npm run build before Go embeds admin assets. No new dependencies or external runtime assets.

## Install / Upgrade / Downgrade / Uninstall

Existing binary installation paths. Upgrade applies migration 00023 and enables absent visibility preferences. Uninstall unchanged.

## Update Channels and Compatibility

No updater, minimum OS or channel changes. Additive HTTP fields; older clients may ignore them.

## Data Migration and Rollback

See persistence_schema.md. Disabling visuals is reversible independently of database rollback.

## Release Notes and Support

Russian Unreleased entry describes level emblems, remaining like/buff uses, compact large quotas and off switches.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

Packaging pipeline edits, release execution and installer changes are not required for this existing-app feature.
