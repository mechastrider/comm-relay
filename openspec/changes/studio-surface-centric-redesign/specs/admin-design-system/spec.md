## Purpose

Extend the admin design system so Studio is preview-first, height-capped inspectors scroll their body, and appearance complexity is disclosed progressively without clipping Publish or copy.

## ADDED Requirements

### Requirement: Studio layout is preview-first
On wide desktop viewports Studio SHALL give the preview pane more horizontal space than the surface list or the inspector. Preview chrome that is always visible MUST be limited to Replay, the primary Follow-active copy action, and a compact overflow for preview size, backdrop, sample versus live chat, and pinned URL. Labels and overflow MUST sit outside the preview iframe so they never cover program output.

#### Scenario: Wide Studio
- **WHEN** the viewport is at least 1024 CSS pixels wide and Studio is active
- **THEN** the preview pane is the widest of the three Studio regions
- **AND** Replay and Follow-active copy remain reachable without opening Advanced

#### Scenario: Compact Studio
- **WHEN** the viewport is narrower than the Studio three-column breakpoint
- **THEN** surface list, preview, and inspector stack in that order as one document flow
- **AND** primary copy and Publish remain reachable without horizontal page scrolling

#### Scenario: Short Studio window
- **WHEN** Studio height is too small for preview plus inspector content
- **THEN** the inspector body scrolls while the Studio heading, dirty status, and Publish remain reachable
- **AND** the last Advanced field and its hint are reachable without being covered by the footer or Publish

### Requirement: Theme picking is visual
The essential theme control SHALL present each supported overlay theme as a labeled visual choice, not as the only appearance of a long unlabeled list of engineering names. Each choice MUST expose the theme's accessible name. Selecting a theme MUST update the draft preview.

#### Scenario: Choose cockpit popups
- **WHEN** the operator activates the Cockpit popups theme choice
- **THEN** the Studio preview uses theme `cockpit_popups` in the draft
- **AND** the choice is identifiable by accessible name as well as appearance

### Requirement: Progressive disclosure does not hide required names
Collapsed Advanced, preview overflow, and Add to OBS triggers MUST have visible text or an accessible name plus hover/focus tooltip when icon-only. Opening a disclosure MUST not trap focus or clip the newly revealed fields.

#### Scenario: Open Advanced with keyboard
- **WHEN** a keyboard user opens Advanced
- **THEN** focus is visible on the disclosure control or the first revealed field
- **AND** the operator can reach every revealed field and return to Publish
