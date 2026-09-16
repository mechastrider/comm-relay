## Purpose

Provide a dedicated full-canvas OBS Browser Source for a manually controlled end-of-stream recap.

## ADDED Requirements

### Requirement: Recap has a dedicated transparent Browser Source
`GET /overlay/recap` with and without a trailing slash SHALL serve a recap document independent from chat, leaderboard, and `/overlay/alert`. Its root SHALL fill the Browser Source rectangle and `html` and `body` MUST remain transparent. While recap state is hidden, the page MUST render no visible chrome.

#### Scenario: Hidden production source
- **WHEN** OBS loads `/overlay/recap` while server recap state is hidden
- **THEN** the entire Browser Source remains transparent

#### Scenario: Alert source is constrained
- **WHEN** `/overlay/alert` occupies a short banner rectangle and `/overlay/recap` occupies a 1920×1080 rectangle
- **THEN** showing recap fills only the dedicated recap rectangle and does not change alert layout or queue state

### Requirement: Every theme renders a readable full-canvas recap
The recap page SHALL support every existing overlay theme and resolve the active preset or a valid `preset` query using the same rules as other themed surfaces. It SHALL render a full-canvas composition with closing title, aggregate summary, leaderboard, and eligible achievement groups. The composition MUST adapt when ranking or achievement sections are empty, keep complete primary content inside landscape, square, and portrait rectangles, avoid scrollbars, and replace decorative motion with static emphasis under reduced motion.

#### Scenario: No achievements
- **WHEN** a visible snapshot has ranking rows but no achievement groups
- **THEN** the ranking expands into the available composition without an empty achievements panel

#### Scenario: Narrow portrait source
- **WHEN** the recap source is portrait-oriented
- **THEN** summary, ranking, and achievements stack without clipped names, XP, or page scrollbars

#### Scenario: Reduced motion
- **WHEN** the operating system requests reduced motion
- **THEN** recap content becomes visible without entrance or idle animation

### Requirement: Recap rendering is safe and resilient
The page SHALL construct operator- and viewer-authored text with text nodes, accept only safe local asset names or HTTP(S) portrait URLs under existing portrait rules, recover from broken portraits with a stable themed fallback, and reconnect to production `/ws` with bounded backoff. Unknown frames MUST be ignored.

#### Scenario: Markup-like names
- **WHEN** a snapshot contains HTML-like viewer or achievement text
- **THEN** the text is displayed literally and no markup executes

#### Scenario: Broken portrait
- **WHEN** a snapshotted portrait cannot load
- **THEN** a stable fallback appears without blocking the rest of the recap

### Requirement: Visibility recovers after Browser Source reconnect
The production recap page SHALL apply the current server visibility snapshot on connection and later recap state frames. Reconnecting during a visible recap MUST restore the same immutable snapshot. Hiding MUST clear all recap DOM content. A process restart MUST leave the page hidden until another explicit Show action.

#### Scenario: OBS reload during recap
- **WHEN** OBS reloads `/overlay/recap` while the server still marks a snapshot visible
- **THEN** the same snapshot is rendered after reconnect

#### Scenario: Hide recap
- **WHEN** the operator hides the visible recap
- **THEN** connected recap pages clear the composition and become transparent

### Requirement: Studio sample preview is isolated from production
`/overlay/recap?preview=sample` SHALL render a built-in bounded sample using the selected draft appearance and preview background without fetching live session history or applying production recap state. Preview MUST NOT capture a recap, mutate visibility, or broadcast a frame.

#### Scenario: Preview during a live recap
- **WHEN** Studio opens sample preview while a production recap is visible
- **THEN** the preview shows fictitious sample data and production remains unchanged
