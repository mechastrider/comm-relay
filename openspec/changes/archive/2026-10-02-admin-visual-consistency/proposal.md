## Why
The visual audit found browser-default greeting fieldsets, inconsistent action sizes and emphasis, and competing CSS definitions. The operator approved a shared visual contract and implementation on a separate branch.
## Users and Supported Platforms
Streamers using the browser admin or existing Wails desktop shell. Existing OS support remains unchanged.
## What Changes
Normalize actions to 38px / 12px on desktop and at least 44px on narrow screens. Use equal-size primary green, neutral secondary and red destructive variants. Share form sections across greetings, commands and awards; consolidate field, heading, chip and native control styles throughout admin.
## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `admin-design-system`: consistent action geometry, form sections and semantic visual roles.
## Scope / Non-Goals
Preserve dark palette, monospace font, physical buttons, workflows, field IDs, validation, navigation and APIs. No new UI library, OBS theme redesign, persistence or backend behavior changes.
## Impact
React admin and CSS, localization of section titles, regression tests and Russian changelog. No new OS permissions, IPC, security boundary, packaging format or data migration.
