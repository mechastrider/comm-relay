## Purpose

Add a backward-compatible appearance override for the dedicated recap surface.

## ADDED Requirements

### Requirement: Overlay presets may configure recap backdrop opacity
Each overlay preset MAY include `surfaces.recap.panel_opacity` as a number from 0 through 1. When omitted, each theme SHALL resolve a readable full-canvas recap default without materializing the field during load or an unchanged publish. An explicit value, including zero, SHALL win. Unknown recap surface keys MAY be ignored, and page opacity MUST remain unsupported.

#### Scenario: Legacy preset
- **WHEN** an existing preset has no `surfaces.recap`
- **THEN** `/overlay/recap` uses the theme's recap default and the config is not rewritten

#### Scenario: Explicit transparent backdrop
- **WHEN** the operator publishes recap panel opacity `0`
- **THEN** recap panel chrome becomes transparent while its text and decorative content remain rendered

#### Scenario: Invalid recap opacity
- **WHEN** an update sets recap panel opacity to `1.2`
- **THEN** the update is rejected with a field error and the stored preset is unchanged
