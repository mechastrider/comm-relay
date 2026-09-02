## Purpose

Extend the admin design system with a consistent, accessible policy for familiar action icons.

## ADDED Requirements

### Requirement: Familiar contextual actions use the shared icon control

Context-bound copy, refresh, and replay actions SHOULD use the shared icon-only control with the existing inline SVG visual language. Every icon-only action MUST have a localized accessible name, a localized hover/focus tooltip, a visible keyboard focus state, and a pointer target consistent with peer controls.

#### Scenario: Copy action beside an overlay URL
- **WHEN** the URL and action context are visible together
- **THEN** the action is represented by the standard copy icon
- **AND** keyboard and assistive-technology users can identify and invoke it

#### Scenario: Action reports progress or success
- **WHEN** an icon action is loading or has completed
- **THEN** its control identity remains stable
- **AND** status is communicated with accessible text rather than only an icon change

### Requirement: Icons do not replace necessary action labels

Primary, destructive, uncommon, or contextually ambiguous actions MUST retain visible text; they MAY pair that text with an icon.

#### Scenario: Run a test scenario
- **WHEN** Studio presents the primary scenario action
- **THEN** the action retains a visible localized label

#### Scenario: Destructive or workflow-specific action
- **WHEN** an action cannot be reliably inferred from a familiar icon and nearby context
- **THEN** its meaning is not conveyed by an icon alone
