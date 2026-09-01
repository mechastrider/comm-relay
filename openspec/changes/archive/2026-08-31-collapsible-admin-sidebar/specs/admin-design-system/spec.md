## ADDED Requirements

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

