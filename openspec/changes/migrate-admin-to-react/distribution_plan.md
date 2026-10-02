# Distribution Plan

## Artifact Matrix
Preserve Windows amd64 zip, macOS universal zip, Linux amd64 tar, and headless Go runtime. Available-environment smoke only; unavailable native targets are reported.

## Build Reproducibility and Provenance
Root package-lock.json and npm ci. Build web/admin/dist before every Go/Wails build, including CI validation and release matrix jobs. Embed compiled assets only for admin; preserve other static surfaces. Development uses Vite with API/WS/OAuth/surface proxies; disk mode reads admin/dist. Missing assets fail clearly. Keep output ignored; no placeholder is committed. A fresh checkout must build frontend before Go compilation.

## Install / Upgrade / Downgrade / Uninstall
No installation or user-data changes. Ready-made binaries do not require Node.

## Update Channels and Compatibility
No update-channel or supported-platform changes. Existing hash links, API, and bridge contracts remain supported.

## Data Migration and Rollback
No data migration; previous binary remains the rollback path.

## Release Notes and Support
Update development/build instructions and agent conventions. A behavior-preserving refactor requires no product changelog entry; actual user-visible corrections must be documented separately.

## Authority Boundary
No signing, notarization, publishing, or release is authorized by this implementation task.
