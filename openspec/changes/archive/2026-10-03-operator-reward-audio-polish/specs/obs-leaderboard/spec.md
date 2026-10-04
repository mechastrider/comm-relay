## ADDED Requirements

### Requirement: Ranking content is anchored to the top
Leaderboard ranking content SHALL start at the top of its Browser Source rectangle, respecting existing theme padding and title spacing, in panel and chips layouts and sample previews. Resizing or changing rank count MUST NOT bottom-anchor the ranking. Transparent background, complete-row fitting, active reward presentation, and existing visibility policies MUST remain intact.

#### Scenario: Tall source with few rows
- **WHEN** the leaderboard source has more height than its title and ranking require
- **THEN** the title and ranks start at the top inside theme padding
- **AND** spare space stays below the ranking

#### Scenario: Theme and size changes
- **WHEN** the operator changes theme, layout, viewport size, or row count
- **THEN** the ranking stays top-aligned and only complete rows are shown
