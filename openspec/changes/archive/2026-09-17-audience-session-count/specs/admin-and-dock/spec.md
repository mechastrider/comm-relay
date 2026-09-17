# Spec Delta

## MODIFIED Requirements

### Requirement: Audience table headers are a distinct sortable surface
The Audience viewers table header SHALL use a distinct surface or edge from the body while keeping header text contrast. XP, Messages, and Streams SHALL be sort buttons. The unsorted table SHALL keep the server last-activity order. The first activation of a numeric column SHALL sort that column descending; a second activation SHALL sort ascending; a third SHALL restore last-activity order. XP and Messages sort using the selected period. Streams sort using lifetime `session_count` and MUST NOT follow the selected period. The active column SHALL expose `aria-sort` (`ascending`, `descending`, or `none`). The selected column and direction SHALL persist in the current browser or WebView and MUST NOT be written to SQLite or `config.json`. An invalid stored preference SHALL fall back to last-activity order. A previously stored Score sort preference SHALL be treated as XP.

#### Scenario: First sort by score
- **WHEN** the operator activates XP while the table is in last-activity order
- **THEN** rows are ordered by the selected period's `xp` descending and XP reports `aria-sort` `descending`

#### Scenario: Cycle back to activity
- **WHEN** XP is already sorted ascending and the operator activates XP again
- **THEN** rows return to last-activity order and XP reports `aria-sort` `none`

#### Scenario: Restore sort preference
- **WHEN** the operator sorted Messages descending, closed the console, and reopens Audience in the same browser or WebView
- **THEN** Messages is again sorted descending for the current period

#### Scenario: First sort by streams
- **WHEN** the operator activates Streams while the table is in last-activity order
- **THEN** rows are ordered by `session_count` descending and Streams reports `aria-sort` `descending`

#### Scenario: Restore streams sort preference
- **WHEN** the operator sorted Streams descending, closed the console, and reopens Audience in the same browser or WebView
- **THEN** Streams is again sorted descending

## ADDED Requirements

### Requirement: Audience directory shows participating streams
The Audience viewers table SHALL include a localized Streams column (Russian **Эфиры**) that displays each viewer's `session_count`. Changing the session/day/all-time period MUST NOT change the Streams values. The period hint SHALL state that XP and message columns follow the selected period and that Streams does not.

#### Scenario: Period filter leaves streams unchanged
- **WHEN** the operator switches the Audience period from session to all-time
- **THEN** Streams cell values stay the same while XP and Messages update to the selected period

#### Scenario: Empty participation
- **WHEN** a listed viewer has `session_count` 0
- **THEN** the Streams cell shows 0

### Requirement: Viewer card shows participating streams
The existing wide Audience inspector and compact viewer sheet SHALL show a localized lifetime streams statistic from `session_count` with the viewer's other summary statistics. The value MUST NOT depend on the Audience period filter. Loading or failing to load reward history MUST NOT hide this statistic.

#### Scenario: Open a viewer who chatted in three streams
- **WHEN** the operator opens a viewer whose `session_count` is 3
- **THEN** the card shows 3 streams

#### Scenario: Period change does not rewrite the card streams row
- **WHEN** the operator changes the Audience period while a viewer card is open
- **THEN** the streams statistic remains the same
