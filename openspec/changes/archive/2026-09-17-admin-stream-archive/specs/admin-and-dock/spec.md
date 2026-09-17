# Spec Delta

## MODIFIED Requirements

### Requirement: Audience provides a dedicated progression workspace
Audience SHALL expose top-level tabs in the order Viewers, Archive, Journal, Progression, Commands, Greetings, and Awards. Progression SHALL contain Achievements, Levels, and Unlock alerts sections. The tab strip MUST scroll horizontally at constrained widths and bring the selected tab into view without wrapping or clipping its accessible label. Archive MUST NOT reuse the Journal tab or the Viewers Streams column.

#### Scenario: Open progression after greetings shipped
- **WHEN** the operator opens Audience and selects Progression
- **THEN** the existing Greetings tab remains available and the progression sections load without leaving Audience

#### Scenario: Narrow window
- **WHEN** all seven Audience tabs do not fit the available width
- **THEN** the strip scrolls horizontally and keyboard focus plus selected state remain visible

#### Scenario: Open archive without Recap
- **WHEN** the operator opens Audience and selects Archive
- **THEN** the session list loads in Audience without opening the Recap dialog
- **AND** Journal remains a separate award-history tab

## ADDED Requirements

### Requirement: Audience Archive lists durable stream sessions
Audience Archive SHALL list bounded newest-first session summaries from the same session history as Recap History. Each row SHALL show started time, current or completed marker, captured marker when a recap exists, and viewer/message/XP totals. Further pages SHALL load only when the operator requests them. An empty history SHALL show an empty state. Header and tab chrome MUST remain visible while the list body scrolls at constrained desktop heights.

#### Scenario: Review recent streams
- **WHEN** the operator opens Audience Archive with more than one stored session
- **THEN** newest sessions appear first with totals and current/completed/captured markers
- **AND** the Recap dialog is not opened

#### Scenario: Paginate archive
- **WHEN** more sessions exist than the first page
- **THEN** Archive shows a control to load the next page and does not auto-fetch further pages

### Requirement: Audience Archive opens a session recap card
Selecting an archive row SHALL open that session's detail with aggregate totals, bounded ranking, eligible achievements, and recap-captured time when a snapshot exists. Sessions without a recap MUST remain reviewable from live aggregates. The card MUST NOT offer Show, Show all-time, or Hide recap. When a stored session snapshot is present, Archive SHALL offer the same Download image action used for a session recap in the Recap dialog. When no snapshot is present, Download MUST NOT appear. A Back control SHALL return to the list. Recap dialog History SHALL remain available from Live.

#### Scenario: Open a prior session without Recap
- **WHEN** the operator opens a completed session that has no recap snapshot from Audience Archive
- **THEN** available aggregate totals, ranking, and achievements render
- **AND** no Show on stream control appears
- **AND** Download image is hidden

#### Scenario: Download a captured session image
- **WHEN** the operator opens a session that has a stored recap snapshot from Audience Archive and chooses Download image
- **THEN** an opaque 16:9 PNG of that session presentation downloads
- **AND** overlay visibility does not change

#### Scenario: Short desktop window
- **WHEN** the session detail exceeds a roughly 700-pixel-high webview
- **THEN** the body scrolls while Archive tabs, Back, and close-adjacent chrome remain reachable
