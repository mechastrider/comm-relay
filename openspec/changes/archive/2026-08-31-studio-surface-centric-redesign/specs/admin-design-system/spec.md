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
- **AND** a sticky compact action bar keeps draft state, Use on stream when applicable, and Publish reachable without covering the last field

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

#### Scenario: Read theme choices at compact width
- **WHEN** the Studio inspector is compact or viewed at 200% zoom
- **THEN** theme cards retain a readable label of at least the interface caption size, a visible selected mark, and a usable touch target

### Requirement: Progressive disclosure does not hide required names
Collapsed Advanced, preview overflow, and Add to OBS triggers MUST have visible text or an accessible name plus hover/focus tooltip when icon-only. Opening a disclosure MUST not trap focus or clip the newly revealed fields.

#### Scenario: Open Advanced with keyboard
- **WHEN** a keyboard user opens Advanced
- **THEN** focus is visible on the disclosure control or the first revealed field
- **AND** the operator can reach every revealed field and return to Publish

### Requirement: Studio communicates preview and surface state
The surface selector selected state SHALL combine at least two of background, edge marker, icon treatment, label weight, or explicit mark so it is not color-only. Surface controls SHALL use localized accessible names and SHALL support directional keyboard movement as a group.

The preview SHALL expose loading and failed states outside the iframe. Failure SHALL offer Retry without discarding or publishing the draft. Essentials SHALL show a compact copy action instead of requiring the raw URL; All settings SHALL keep the selectable raw and pinned URLs.

#### Scenario: Preview fails and retries
- **WHEN** the selected surface preview does not load within the client timeout or emits an error
- **THEN** Studio shows a localized failed state and Retry control
- **AND** retry reloads the same surface with the same unpublished draft

### Requirement: Studio panels share one visual grid
The surface rail, preview, and inspector SHALL align to the same top edge and SHALL use one spacing rhythm for panel padding, internal section gaps, and control groups. Peer panels MUST use consistent border, radius, and surface treatment so the workspace reads as one editor rather than unrelated cards. On wide screens the inspector MAY grow beyond its base width while the preview remains the widest region. Preview overflow and Advanced SHALL provide clear spacing between adjacent fields and group boundaries.

#### Scenario: Compare wide panel geometry
- **WHEN** Studio is viewed at a wide desktop size
- **THEN** the three primary panel shells start and end on common grid lines where their content permits
- **AND** headings and first controls use matching insets

#### Scenario: Align All-settings preview chrome
- **WHEN** Studio is in All settings at a wide desktop size
- **THEN** Replay, the selectable Follow-active URL, its copy action, and preview overflow share one control height and top baseline
- **AND** the URL retains a localized accessible name without requiring a visible Follow-active caption

#### Scenario: Dirty prompt fits the viewport
- **WHEN** a localized dirty-navigation prompt opens in a narrow window
- **THEN** its frame and both actions remain within the viewport without horizontal page scroll
- **AND** long action labels wrap or the actions stack rather than overflowing

### Requirement: Surface rail collapse has purposeful motion
Collapsing or expanding the wide surface rail SHALL animate the label and panel transition within 150–300 milliseconds without blocking input. Motion MUST NOT be the only indication of state, MUST avoid content flashing, and MUST be disabled when `prefers-reduced-motion: reduce` is active. Compact horizontal navigation MUST NOT inherit the wide collapse animation.

#### Scenario: Reduced motion rail toggle
- **WHEN** the operator requests reduced motion and toggles the wide rail
- **THEN** the rail reaches the same expanded or collapsed state without an animated transition
