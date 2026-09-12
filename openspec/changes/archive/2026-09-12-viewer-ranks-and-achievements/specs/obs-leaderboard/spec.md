## Purpose

Optionally show the current all-time XP title in leaderboard rows.

## ADDED Requirements

### Requirement: Leaderboard titles are an optional preset presentation
Each leaderboard preset SHALL support boolean `show_viewer_titles`, default false when omitted. When enabled, live and sample rows SHALL show each viewer's current all-time XP title as secondary text. Responsive fitting MUST preserve rank, name, and XP before title text; title text MAY be hidden first when a complete row would otherwise not fit. Titles MUST NOT change ordering, periods, score, or row eligibility.

#### Scenario: Existing preset
- **WHEN** a preset omits `show_viewer_titles`
- **THEN** the leaderboard renders exactly without viewer titles

#### Scenario: Sample preview
- **WHEN** Studio enables viewer titles on an unpublished leaderboard draft
- **THEN** the fictitious sample rows show titles without reading live viewer data

#### Scenario: Constrained height
- **WHEN** title text would cause the last complete row to clip
- **THEN** the row title is hidden before rank, viewer name, or XP is removed
