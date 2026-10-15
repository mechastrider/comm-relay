## Why
Recap rankings lose level emblems already shown in chat and leaderboard, making viewer status less recognizable.
## Users and Supported Platforms
Streamers using the browser admin, supported desktop shells, OBS recap, and recap PNG export.
## What Changes
Preserve an optional emblem alongside each ranking title at capture; render the shared badge next to the name. All-time presentations use their generation-time level. Old snapshots remain unchanged.
## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `stream-recaps`: capture and transport optional ranking emblems.
- `viewer-visual-status`: render recap ranking badges consistently.
## Scope / Non-Goals
No achievement badges, new switches, snapshot backfills, session lifecycle changes, or new platform integration.
## Impact
Additive JSON property in existing version-1 payloads, reused UI assets, no database migration or new permissions. No distribution changes.
