## Purpose

Extend the admin design system with a consistent, accessible policy for familiar action icons.

## ADDED Requirements

### Requirement: Familiar contextual actions use the shared icon control

Context-bound copy, refresh, replay, and preset-management actions SHOULD use the shared icon-only control with the existing inline SVG visual language. Every icon-only action MUST have a localized accessible name, a localized hover/focus tooltip, a visible keyboard focus state, and a pointer target consistent with peer controls.

#### Scenario: Copy action beside an overlay URL
- **WHEN** the URL and action context are visible together
- **THEN** the action is represented by the standard copy icon
- **AND** keyboard and assistive-technology users can identify and invoke it

#### Scenario: Action reports progress or success
- **WHEN** an icon action is loading or has completed
- **THEN** its control identity remains stable
- **AND** status is communicated with accessible text rather than only an icon change

#### Scenario: Manage the selected preset
- **WHEN** Studio shows the preset selector
- **THEN** create, rename, duplicate, and delete are visible as a compact adjacent group of familiar icon controls
- **AND** the controls do not move into a text overflow menu because of the current preset count
- **AND** delete has distinct destructive styling, is disabled when deletion is unavailable, and still requires confirmation

### Requirement: Shared action buttons have physical depth

Shared text and icon action buttons MUST appear raised at rest and on hover, MUST appear pressed while active, and MUST retain visible focus and disabled states. This physical treatment MUST remain legible in supported light and dark themes and MUST NOT be applied to tabs, navigation links, selects, or choice chips merely because they are interactive.

#### Scenario: Press a shared action button
- **WHEN** the operator presses a shared text or icon action button
- **THEN** its border, gradient, shadow, or position changes from raised to pressed without moving surrounding layout

#### Scenario: Button is unavailable
- **WHEN** a shared action button is disabled or busy
- **THEN** its raised styling is subdued and it cannot be mistaken for an enabled control

### Requirement: Icons do not replace necessary action labels

Primary, uncommon, or contextually ambiguous actions MUST retain visible text; they MAY pair that text with an icon. Destructive actions MUST retain visible text unless they belong to the explicit preset-management group, where nearby context, destructive styling, a localized accessible name and tooltip, and a confirmation step make the icon-only action unambiguous.

#### Scenario: Run a test scenario
- **WHEN** Studio presents the primary scenario action
- **THEN** the action retains a visible localized label

#### Scenario: Destructive or workflow-specific action
- **WHEN** an action cannot be reliably inferred from a familiar icon and nearby context
- **THEN** its meaning is not conveyed by an icon alone
