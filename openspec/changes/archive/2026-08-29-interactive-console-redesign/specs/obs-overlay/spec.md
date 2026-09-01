## Purpose

Clarify active and pinned preset behavior so default OBS source URLs remain stable across live preset changes.

## MODIFIED Requirements

### Requirement: Appearance follows the active preset and optional URL overrides
Overlay look SHALL come from `overlay.presets` and `active_preset_id` (theme, display mode, font size, style tokens, panel image). When `preset` is absent, `/overlay` and `/leaderboard` MUST follow the current `active_preset_id`, including changes delivered through `overlay_settings`. When a valid `preset` is present, that source MUST remain pinned to the named preset. Query parameters `max_messages`, `message_ttl_seconds`, `font_size_px`, `display_mode`, and `theme` SHALL override matching values when valid so one process can feed multiple OBS scenes.

#### Scenario: Unpinned source follows activation
- **WHEN** an overlay or leaderboard URL has no `preset` query and the active preset changes
- **THEN** the source applies the newly active preset without requiring its OBS URL to be replaced

#### Scenario: Pinned preset query
- **WHEN** OBS loads `/overlay?preset=<id>` for an existing preset and another preset becomes active
- **THEN** the source continues using the preset named in its URL

#### Scenario: Invalid preset query
- **WHEN** the URL names a preset that does not exist
- **THEN** the source falls back to the active preset without failing to render

#### Scenario: Invalid theme query
- **WHEN** the URL has `theme=not-a-theme`
- **THEN** the overlay keeps the configured theme

## ADDED Requirements

### Requirement: Admin source copy distinguishes following and pinned URLs
Studio SHALL offer an unpinned URL that follows the active preset as the primary copy action for overlay and leaderboard sources. It SHALL also offer an explicitly labeled pinned URL for operators who require a scene-specific preset. Existing URLs with `preset` MUST remain valid.

#### Scenario: Copy default overlay source
- **WHEN** the operator uses the primary copy action for the chat overlay
- **THEN** the copied URL omits `preset` and is labeled as following the active preset

#### Scenario: Copy pinned leaderboard source
- **WHEN** the operator chooses the pinned copy option for a leaderboard preset
- **THEN** the copied URL includes that preset's identifier and is labeled as pinned
