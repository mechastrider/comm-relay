## Purpose

Define the leaderboard's full-frame layout and isolated test updates.

## ADDED Requirements

### Requirement: Leaderboard surface root fills the Browser Source rectangle

The leaderboard's top-level runtime container MUST occupy the complete Browser Source viewport with transparent page background, border-box sizing, and clipped outer overflow. Panel and chips layouts MUST preserve their configured semantics while adapting to the available rectangle.

#### Scenario: Resize either leaderboard layout
- **WHEN** a panel or chips source is rendered in landscape, square, portrait, or narrow-banner rectangles
- **THEN** its surface root follows the viewport without accidental scrollbars or clipped outer chrome
- **AND** the selected layout remains recognizable

### Requirement: Dedicated leaderboard test page uses production snapshot rendering

`GET /overlay/test/leaderboard` MUST connect only to `/ws/overlay-debug`, MUST NOT fetch or subscribe to production rankings, MUST apply test leaderboard frames through its production snapshot renderer, and MUST clear its test ranking and related transient state on `debug_reset`. Normal `/overlay/leaderboard` behavior MUST remain unchanged.

#### Scenario: Fire a leaderboard update
- **WHEN** `leaderboard_update` arrives at a test leaderboard
- **THEN** its deterministic three-row test ranking replaces the prior test ranking
- **AND** no statistics or viewer score is persisted
