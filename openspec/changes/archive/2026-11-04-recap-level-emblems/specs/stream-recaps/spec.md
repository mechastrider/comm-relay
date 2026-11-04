## ADDED Requirements

### Requirement: Recap ranking emblems preserve captured level identity
Recap ranking rows SHALL carry an optional built-in `emblem` alongside the level `title`, resolved from the same lifetime-XP level. Session snapshots MUST preserve both at first capture without re-resolving historical levels. All-time presentations SHALL resolve both at generation time. Existing version-1 snapshots without emblems MUST remain readable and MUST NOT be backfilled.

#### Scenario: Progression changes after capture
- **WHEN** a viewer gains XP or the level title/emblem is edited after capture
- **THEN** stored recap title and emblem remain unchanged

#### Scenario: Legacy snapshot
- **WHEN** a stored snapshot has no emblem property
- **THEN** it remains valid and no emblem is inferred from current levels

#### Scenario: All-time recap
- **WHEN** an all-time recap presentation is generated
- **THEN** ranking titles and emblems reflect the levels at generation time
