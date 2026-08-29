## Purpose

Define the reusable visual, interaction, accessibility, and responsive foundation for the CommRelay operator console.

## ADDED Requirements

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

### Requirement: Loading, empty, error, and stale states preserve workspace context
Every data-backed workspace region SHALL distinguish loading, empty, recoverable error, and populated states without replacing the entire console. Failed independent resources MUST expose retry where recovery is possible.

#### Scenario: Leaderboard request fails
- **WHEN** leaderboard loading fails while recent messages are available
- **THEN** Live continues showing messages and the leaderboard region shows a scoped error with retry

#### Scenario: Refresh retains prior data
- **WHEN** a populated region refreshes in the background
- **THEN** its prior data remains visible with a nonblocking updating state until replacement data arrives
