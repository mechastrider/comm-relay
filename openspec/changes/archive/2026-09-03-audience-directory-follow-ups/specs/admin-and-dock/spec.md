## ADDED Requirements

### Requirement: Audience table headers are a distinct sortable surface
The Audience viewers table header SHALL use a distinct surface or edge from the body while keeping header text contrast. Score and Messages SHALL be sort buttons. The unsorted table SHALL keep the server last-activity order. The first activation of a numeric column SHALL sort that column descending for the selected period; a second activation SHALL sort ascending; a third SHALL restore last-activity order. The active column SHALL expose `aria-sort` (`ascending`, `descending`, or `none`). The selected column and direction SHALL persist in the current browser or WebView and MUST NOT be written to SQLite or `config.json`. An invalid stored preference SHALL fall back to last-activity order.

#### Scenario: First sort by score
- **WHEN** the operator activates Score while the table is in last-activity order
- **THEN** rows are ordered by the selected period's score descending and Score reports `aria-sort` `descending`

#### Scenario: Cycle back to activity
- **WHEN** Score is already sorted ascending and the operator activates Score again
- **THEN** rows return to last-activity order and Score reports `aria-sort` `none`

#### Scenario: Restore sort preference
- **WHEN** the operator sorted Messages descending, closed the console, and reopens Audience in the same browser or WebView
- **THEN** Messages is again sorted descending for the current period

### Requirement: Audience row activation opens the viewer card
A single pointer activation on an Audience viewer row SHALL open that viewer's card (wide inspector or compact sheet). The display name SHALL be a semantic button that opens the same card. Enter and Space on the focused row or name control SHALL open the same card. The Actions column MUST NOT be present. A decorative chevron MAY remain and MUST be hidden from assistive technology.

#### Scenario: Click row on a wide layout
- **WHEN** the Audience directory is shown at a wide desktop width and the operator activates a viewer row
- **THEN** that viewer is selected and its card loads in the inspector without a separate Actions control

#### Scenario: Keyboard open
- **WHEN** a viewer row or its name control is focused and the operator presses Enter or Space
- **THEN** that viewer's card opens

### Requirement: Audience list shows unique platform icons
The Audience Platforms column SHALL render one compact SVG icon per unique platform id from the list payload. Each icon MUST expose a localized accessible name and tooltip. The column MUST NOT rely on color alone and MUST NOT keep a permanent visible text label beside each icon. When `platforms` is empty, the column SHALL use a localized empty state rather than inventing a platform.

#### Scenario: Merged profile icons
- **WHEN** the list payload for a viewer has `platforms` `["twitch","youtube"]`
- **THEN** the row shows Twitch and YouTube icons, each with an accessible name, and no permanent "Twitch" / "YouTube" text in the cell

#### Scenario: Unknown platform id
- **WHEN** `platforms` includes an unrecognized id
- **THEN** that id still appears as an identifiable icon with the raw id as its accessible name

### Requirement: Audience New stream is separate from filters
The confirmed New stream action in Audience SHALL remain keyboard reachable and MUST NOT sit inside the period/search filter group. It SHALL remain visually distinct from those filters at supported desktop widths. Confirmation and session-reset behavior MUST stay unchanged.

#### Scenario: Audience desktop toolbar
- **WHEN** the Audience viewers view is shown at a supported desktop width
- **THEN** New stream is aligned with the toolbar actions and is not grouped with the period select or search field
