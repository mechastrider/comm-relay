## Purpose

Make responsive leaderboard composition and content hierarchy understandable from Studio without requiring pixel arithmetic.

## MODIFIED Requirements

### Requirement: Studio leaderboard inspector edits title and rank cap
When the selected Studio surface is leaderboard, Essentials SHALL expose sizing as Automatic or Fixed, title as From theme, Custom, or Hidden, and whether message count is shown. Custom title input SHALL appear only when Custom is selected. Fixed font size and `max_entries` (integer 1–20, default 5) SHALL remain reachable in All settings; `max_entries` MUST be labelled as a maximum because source height may show fewer complete rows. All fields SHALL update the existing draft preview and persist only through Publish. Live Messages, dock, and overlay chat SHALL remain unchanged.

#### Scenario: Automatic sizing preview
- **WHEN** the operator selects Automatic and resizes the leaderboard preview
- **THEN** the preview scales the composition from width and changes the number of complete rows from height without publishing

#### Scenario: Custom themed title
- **WHEN** the operator selects Custom, enters `Топ эфира`, and publishes
- **THEN** the preview and live leaderboard use that text in the selected theme's title slot

#### Scenario: Set overlay heading
- **WHEN** the operator selects Custom, types `Топ эфира`, and publishes
- **THEN** the Studio preview and `/overlay/leaderboard` show that text in the same theme-owned title slot

#### Scenario: Hide secondary metric
- **WHEN** the operator leaves message count disabled
- **THEN** the preview shows XP-first rows without message counts

#### Scenario: Maximum rank cap
- **WHEN** max entries is 5 and the preview has room for eight rows
- **THEN** no more than five rows are shown

#### Scenario: Cap at three
- **WHEN** the operator sets max entries to 3 and publishes
- **THEN** the preview and live ranking show at most three complete rows

#### Scenario: Fixed compatibility controls
- **WHEN** the operator selects Fixed in All settings
- **THEN** a labelled 12–48 px field is available with inline validation and is associated with its error text
