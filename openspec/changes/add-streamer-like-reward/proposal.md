## Why

Streamers need a lightweight way to recognize an interesting or simply good viewer message when it does not fit a specific contribution category. A small “Streamer Like” reward fills that gap without introducing community voting or weakening the user-owned catalog contract.

## What Changes

- Add a deletable `like` starter award for newly initialized Russian and English catalogs: “Лайк от стримера” / “Streamer Like”, 5 XP, soft sound, five-second splash, and localized `{viewer}` / `{points}` text.
- Give `like` a stable built-in outlined thumbs-up emblem with a small sparkle when no custom award image is configured.
- Change the Advice starter value from 50 to 25 XP for newly initialized catalogs so the default contribution ladder matches the product concept.
- Preserve every initialized catalog exactly: no migration, re-insertion, translation, or point rewrite for existing databases.
- Keep viewer-to-viewer and threshold-based community likes out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `operator-rewards`: Expand the one-time localized starter catalog and adjust the fresh-catalog Advice value without changing existing user-owned rows.
- `overlay-alerts`: Define the stable semantic emblem used by the new starter reward.

## Impact

The change affects localized starter award definitions, starter-catalog tests, the shared alert emblem map/SVG shapes, frontend emblem tests, user documentation, and the Unreleased changelog. It adds no API, database schema, migration, config key, dependency, or platform integration.
