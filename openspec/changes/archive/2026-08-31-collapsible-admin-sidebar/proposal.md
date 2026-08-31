## Why

The desktop admin sidebar always consumes 196 px even when operators need more room for chat, tables, or Studio controls. Giving each destination a recognizable icon and allowing the sidebar to collapse preserves navigation while returning that space to the active workspace.

## What Changes

- Add one consistent SVG icon to every desktop primary-navigation destination.
- Add an accessible desktop-only control that toggles the sidebar between expanded labels and a compact icon-only state.
- Persist the operator's sidebar preference locally in the current browser/webview, with the expanded state as a safe fallback when storage is unavailable.
- Keep active, hover, focus, tooltip, localization, and reduced-motion behavior usable in both sidebar states.
- Leave the existing narrow-width bottom navigation and all workspace routes unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-design-system`: Extend the responsive navigation contract with desktop iconography, an operator-controlled compact state, accessible icon-only affordances, and local preference restoration.

## Impact

- Affects the static admin shell under `web/admin/`, including navigation markup, shell styles, locale catalogs, and a small client-side controller with focused tests.
- Updates the canonical admin design-system behavior and the `[Unreleased]` user-facing changelog.
- Does not change Go code, HTTP/WebSocket APIs, `config.json`, OBS overlay/dock behavior, dependencies, or workspace hashes.
