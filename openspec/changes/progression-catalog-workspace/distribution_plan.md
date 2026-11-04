# Distribution Plan

## Artifact Matrix

Existing server and Wails release artifacts on supported platforms; no packaging changes.

## Build Reproducibility and Provenance

Run npm ci and npm run build before Go embeds admin assets.

## Install / Upgrade / Downgrade / Uninstall

Existing behavior; no additional dependencies at runtime.

## Update Channels and Compatibility

No channel or minimum OS change.

## Data Migration and Rollback

No migration. UI revert is sufficient for rollback.

## Release Notes and Support

Add a Russian Unreleased note describing navigation and reachable alert settings.

## Authority Boundary

User authorizes branch push and PR creation, not merging or release publishing.
