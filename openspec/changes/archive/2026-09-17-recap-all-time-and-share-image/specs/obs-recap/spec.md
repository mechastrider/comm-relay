## Purpose

Render the selected recap window on the dedicated transparent Browser Source without turning OBS into an image exporter.

## ADDED Requirements

### Requirement: Recap overlay presents the selected window
When `stream_recap_state` is visible with `window` `session`, `/overlay/recap` SHALL render the immutable session snapshot using existing session copy, totals, ranking, and achievement groups. When visible with `window` `all`, it SHALL render the all-time presentation with all-time closing title and metric labels, totals, and ranking, and MUST NOT render an achievements section. Hidden state MUST remain fully transparent. Switching windows MUST replace the composition without requiring New stream or a second Browser Source.

#### Scenario: All-time has no achievement rail
- **WHEN** the visible window is `all` and the last session snapshot contained achievement groups
- **THEN** the overlay shows all-time totals and ranking only
- **AND** no achievement groups from that session appear

#### Scenario: Session window keeps achievements
- **WHEN** the operator switches from all-time back to a stored session snapshot that includes achievement groups
- **THEN** those groups render as they did on first session show

### Requirement: Overlay does not export images
The production recap page MUST NOT offer download, clipboard, or share controls. Image export belongs to the admin Recap dialog. The Browser Source `html` and `body` MUST remain transparent aside from the themed recap composition.

#### Scenario: Hidden production source stays chrome-free
- **WHEN** OBS loads `/overlay/recap` while recap state is hidden
- **THEN** the entire Browser Source remains transparent
- **AND** no download control is present

## MODIFIED Requirements

### Requirement: Every theme renders a readable full-canvas recap
The recap page SHALL support every existing overlay theme and resolve the active preset or a valid `preset` query using the same rules as other themed surfaces. It SHALL render a full-canvas composition with closing title, aggregate summary, leaderboard, and eligible achievement groups for the session window. The all-time window SHALL use the same theme rules with all-time title and metrics and without an achievements section. The composition MUST adapt when ranking or achievement sections are empty, keep complete primary content inside landscape, square, and portrait rectangles, avoid scrollbars, and replace decorative motion with static emphasis under reduced motion. All-time empty totals SHALL remain a valid zero-total closing card.

#### Scenario: No achievements
- **WHEN** a visible snapshot has ranking rows but no achievement groups
- **THEN** the ranking expands into the available composition without an empty achievements panel

#### Scenario: Narrow portrait source
- **WHEN** the recap source is portrait-oriented
- **THEN** summary, ranking, and achievements stack without clipped names, XP, or page scrollbars

#### Scenario: Reduced motion
- **WHEN** the operating system requests reduced motion
- **THEN** recap content becomes visible without entrance or idle animation

#### Scenario: Empty all-time status
- **WHEN** all-time is visible and no canonical viewer has messages
- **THEN** a readable zero-total all-time card is shown without an empty achievements panel
