## Purpose

Keep Follow-active as the primary OBS URL and pinned `preset` URLs as an advanced option, now bound to the selected Studio surface rather than a separate source-setup column.

## MODIFIED Requirements

### Requirement: Admin source copy distinguishes following and pinned URLs
Studio SHALL offer an unpinned URL that follows the active preset as the primary copy action for the selected on-stream surface (chat overlay, leaderboard, or alerts). It SHALL also offer an explicitly labeled pinned URL for operators who require a scene-specific preset, from preview overflow and/or Add to OBS. Existing URLs with `preset` MUST remain valid. Leaderboard period continues to appear on leaderboard URLs as today.

#### Scenario: Copy default overlay source
- **WHEN** the operator uses the primary copy action while chat is the selected surface
- **THEN** the copied URL omits `preset` and is labeled as following the active preset

#### Scenario: Copy pinned leaderboard source
- **WHEN** the operator chooses the pinned copy option for a leaderboard look
- **THEN** the copied URL includes that preset's identifier and is labeled as pinned

#### Scenario: Copy default alert source
- **WHEN** the operator uses the primary copy action while alerts is the selected surface
- **THEN** the copied URL omits `preset` and uses the `/overlay/alert` path for the current listen address
