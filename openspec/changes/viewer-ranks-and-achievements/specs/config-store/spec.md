## Purpose

Persist the optional leaderboard title presentation compatibly in `config.json`.

## ADDED Requirements

### Requirement: Overlay presets may store viewer-title visibility
`surfaces.leaderboard.show_viewer_titles` SHALL be an optional boolean in stored and public overlay presets. Omission MUST resolve to false and MUST NOT rewrite an unchanged legacy preset. Invalid non-boolean values SHALL reject config update with a field error while preserving stored configuration.

#### Scenario: Legacy config load
- **WHEN** an older preset has no `show_viewer_titles` field
- **THEN** public config resolves it as false and the file is not rewritten solely for that default

#### Scenario: Publish enabled titles
- **WHEN** Studio publishes `show_viewer_titles` true
- **THEN** the preset persists true while unrelated configuration and secrets remain unchanged
