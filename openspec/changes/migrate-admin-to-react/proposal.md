## Why

The admin has outgrown its manually synchronized DOM controllers. React and TypeScript match the surrounding projects and provide explicit ownership of state, rendering, and lifecycles while preserving the existing operator interface.

## Users and Supported Platforms

Streamers using the browser admin or Wails on Windows, macOS, and Linux. Native verification is limited to available environments and reported separately from browser tests.

## What Changes

Replace the complete admin implementation with React, TypeScript, and Vite in one delivery. Preserve styling, workflows, data, URLs, translations, and HTTP/WebSocket contracts. Add production-build Playwright regression, component tests, and frontend-before-Go build integration.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `admin-and-dock`: preserve all admin capabilities across the implementation replacement, including drafts and navigation compatibility.
- `desktop-app`: embed the compiled admin and preserve native save integration.

## Scope / Non-Goals

All admin workspaces, catalogs, dialogs, live events, localization, and export. No visual redesign, backend business-rule changes, database migration, cloud dependency, or React migration of OBS/dock pages. No partial migration release.

## Impact

Frontend source, tests, static serving, development commands, CI, Wails/release build sequencing, and contributor instructions change. Runtime remains a single local binary. Test data is disposable; production credentials and user databases are not used. Existing shared surface contracts remain supported.
