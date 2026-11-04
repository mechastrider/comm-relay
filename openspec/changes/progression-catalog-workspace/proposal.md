## Why

Progression presents two independent catalogs and editors side by side, with shared alert settings below both. Operators must relearn the interaction used by Commands and Greetings and scroll to reach common settings and operation feedback.

## Users and Supported Platforms

Streamers using the browser admin or packaged Wails admin on supported desktop platforms, including narrow and short windows.

## What Changes

- Select Levels or Achievements in a single catalog workspace with a list and selected-item editor.
- Open shared alert settings from a labelled top-level button in a bounded dialog.
- Keep actions and operation feedback near the current editor, show useful list summaries, and separate reconciliation from alert appearance.
- Protect unsaved edits across selections, section changes, dialog dismissal and navigation; provide a list/back flow on narrow screens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-and-dock`: progression navigation, catalog editing and alert-settings presentation.

## Scope / Non-Goals

Only admin presentation and draft navigation change. Preserve progression evaluation, API payloads, baseline protection, achievement revision confirmation, filters and preview behavior. No new OS integration, database migration or overlay redesign.

## Impact

React admin components, localized copy, styles, regression coverage and Russian changelog. No data, security/privacy, packaging or update contract changes. Existing shared dialogs and buttons remain the UI foundation.
