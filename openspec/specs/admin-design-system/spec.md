# Admin Design System

## Purpose

Define the reusable visual, interaction, accessibility, and responsive foundation for the CommRelay operator console.

## Requirements

### Requirement: Admin styling uses a layered token system
The admin console SHALL define primitive, semantic, and component token layers for color, typography, spacing, radius, shadow, motion, density, and interaction state. Reusable components and workspace layouts MUST consume semantic or component tokens instead of introducing independent hard-coded palettes.

#### Scenario: Component state styling
- **WHEN** a button, field, tab, table row, badge, or notice renders a default, hover, focus, disabled, loading, success, warning, or error state
- **THEN** its foreground, background, border, and focus treatment resolve through shared semantic or component tokens

#### Scenario: Reduced motion
- **WHEN** the operating system requests reduced motion
- **THEN** nonessential transitions and animations are removed without hiding state changes

### Requirement: Shared controls are keyboard and screen-reader accessible
Navigation, tabs, dialogs, forms, menus, tables, notifications, and icon controls SHALL expose appropriate names, roles, states, and keyboard behavior. Every interactive control MUST have a visible focus indicator and every icon-only control MUST have an accessible name and hover tooltip.

#### Scenario: Keyboard workspace navigation
- **WHEN** a keyboard user tabs through the shell and activates a workspace destination
- **THEN** focus is visible, the workspace changes, and focus moves to or is programmatically associated with its heading

#### Scenario: Dialog keyboard behavior
- **WHEN** a modal dialog opens and the user presses Escape
- **THEN** the dialog closes when dismissal is allowed and focus returns to the control that opened it

#### Scenario: Async feedback
- **WHEN** a save, publish, copy, or hot action succeeds or fails
- **THEN** the result is announced through an appropriate live region without relying only on color

### Requirement: Layout adapts without overlapping or clipping controls
The admin shell SHALL support wide desktop, compact desktop/Wails, and narrow browser layouts. Fixed-format controls MUST retain stable dimensions, text MUST wrap or truncate with an accessible full label, and constrained panels MUST scroll their body while keeping required headers and actions reachable.

#### Scenario: Wide desktop
- **WHEN** the viewport is at least 1024 CSS pixels wide
- **THEN** persistent navigation and the active workspace fit without covering each other, and an available inspector may appear beside primary content

#### Scenario: Narrow browser
- **WHEN** the viewport is 480 CSS pixels wide or less
- **THEN** primary navigation is reachable without horizontal page scrolling and workspace content follows one coherent document flow

#### Scenario: Short desktop window
- **WHEN** the available height is too small for a dialog or split-pane body
- **THEN** the body scrolls while its title and required confirmation actions remain reachable

### Requirement: Desktop primary navigation supports a compact icon state
At viewports where the persistent left navigation is shown, every primary destination SHALL display a consistent icon and the navigation SHALL provide an operator-controlled expanded or compact state. The compact state MUST keep every destination identifiable, keyboard reachable, and visibly selected without changing its route or workspace behavior.

#### Scenario: Operator collapses the desktop sidebar
- **WHEN** the persistent left navigation is expanded and the operator activates its collapse control
- **THEN** the navigation contracts to an icon-only width, the active destination remains visually distinct, and the active workspace gains the released horizontal space
- **AND** every icon-only destination and the expansion control retain an accessible name, visible focus treatment, and localized hover tooltip

#### Scenario: Operator expands the desktop sidebar
- **WHEN** the persistent left navigation is compact and the operator activates its expansion control
- **THEN** the navigation restores the visible localized destination labels without changing the active workspace
- **AND** the control exposes the updated expanded state to assistive technology

#### Scenario: Desktop sidebar preference is restored
- **WHEN** the admin console is reopened in the same browser or desktop webview after the operator changed the sidebar state
- **THEN** the persistent left navigation restores that locally saved state before it becomes interactive
- **AND** storage unavailability or an invalid stored value falls back to the expanded state without blocking navigation

#### Scenario: Narrow navigation remains available
- **WHEN** the viewport is narrower than the persistent-sidebar breakpoint
- **THEN** the existing bottom primary navigation remains available and is not replaced or hidden by the saved desktop sidebar state

### Requirement: Loading, empty, error, and stale states preserve workspace context
Every data-backed workspace region SHALL distinguish loading, empty, recoverable error, and populated states without replacing the entire console. Failed independent resources MUST expose retry where recovery is possible.

#### Scenario: Leaderboard request fails
- **WHEN** leaderboard loading fails while recent messages are available
- **THEN** Live continues showing messages and the leaderboard region shows a scoped error with retry

#### Scenario: Refresh retains prior data
- **WHEN** a populated region refreshes in the background
- **THEN** its prior data remains visible with a nonblocking updating state until replacement data arrives

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
