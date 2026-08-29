## Why

CommRelay has outgrown its chat-first admin cockpit. Viewer statistics, leaderboards, OBS surfaces, connection diagnostics, and future interaction tools now compete inside one screen and several modal dialogs. Operators need a console organized around live work, with immediate controls separated from preparation and system settings.

## Users and Supported Platforms

The primary user is a streamer or OBS operator running CommRelay locally. The redesign supports the existing Twitch, YouTube, and VK workflows in both the headless browser admin and the Wails desktop shell. Responsive layouts cover desktop browser, compact desktop windows, and narrow mobile browser access; no native mobile application is introduced.

## What Changes

- Replace the chat-centric cockpit with persistent workspaces for Live, Audience, Studio, and Settings. Messages become one Live view alongside leaderboard and current statistics.
- Separate hot controls that apply immediately, Studio drafts that require Publish, and cold settings that require an explicit Save.
- Introduce a three-layer design system (primitive, semantic, and component tokens) plus reusable accessible navigation, tabs, tables, forms, status, and feedback components.
- Preserve all currently implemented platform, viewer, diagnostic, preset, and data-management workflows while moving them to task-oriented locations.
- Make newly copied OBS source URLs stable by default: an unpinned URL follows the active preset. Existing and explicitly pinned `preset` URLs remain compatible.
- Add a targeted `POST /api/overlay/activate` action so changing the active preset cannot overwrite unrelated configuration.

## Capabilities

### New Capabilities

- `admin-design-system`: shared tokens, components, interaction states, accessibility, and responsive layout rules for the admin console.

### Modified Capabilities

- `admin-and-dock`: task-oriented console information architecture and workspace behavior.
- `config-store`: atomic active-preset mutation that preserves unrelated configuration.
- `http-api`: targeted active-preset activation action and response contract.
- `obs-overlay`: stable default source URLs that resolve the current active preset while retaining pinned URL behavior.

## Scope / Non-Goals

Viewer commands, splash-message administration, a functional Interactions workspace, OBS WebSocket scene control, new historical analytics, overlay theme redesign, a frontend framework migration, and native Wails shell changes are excluded. The information architecture reserves room for later interaction tooling without presenting nonfunctional controls now.

## Impact

Most work is a static admin refactor under `web/admin`, with focused API/config changes and regression tests. Existing `config.json`, SQLite data, secrets, platform connectors, OBS routes, packaging, and localhost-only security boundaries remain intact. No data migration or new external dependency is required.
