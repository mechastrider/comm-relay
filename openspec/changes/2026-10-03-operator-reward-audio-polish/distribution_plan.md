# Distribution Plan

## Artifact Matrix

Existing server and Windows Wails artifacts retain their names, supported targets, and build pipeline. Smoke the current Windows target and browser admin.

## Build Reproducibility and Provenance

Use the checked-in npm lockfile; build admin assets before Go embeds them. No new dependency or toolchain requirement.

## Install / Upgrade / Downgrade / Uninstall

Existing installation flow applies. Missing preference enables monitoring on upgrade; saved false persists. No uninstall changes.

## Update Channels and Compatibility

Existing channels and minimum OS remain unchanged. No signing or installer changes.

## Data Migration and Rollback

Additive JSON preference only; see persistence schema for older-writer behavior. No database migration.

## Release Notes and Support

Add concise Russian Unreleased bullets for the three changes. Explain default-enabled app audio and its independent switch.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

New packaging, auto-update design, minimum-OS changes, notarization, and release publication are not part of this change.
