## ADDED Requirements

### Requirement: Recap rankings display level badges
Admin recap details, the OBS recap surface, and recap PNG export SHALL render the shared level badge next to ranking names when both title and emblem exist. The badge MUST have the localized level name as accessible label and hover title. Missing emblems MUST render no badge. Achievement groups MUST NOT gain level badges.

#### Scenario: Captured level badge
- **WHEN** a recap ranking row includes a title and emblem
- **THEN** its name is accompanied by the shared emblem in admin, OBS and exported PNG

#### Scenario: Missing level emblem
- **WHEN** a ranking row has no emblem or no title
- **THEN** the row renders its existing content without a level badge
