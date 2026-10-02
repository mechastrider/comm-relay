## ADDED Requirements
### Requirement: Admin action geometry is independent of emphasis
Ordinary admin action buttons SHALL use shared 38 CSS pixel minimum height, 12px text and consistent padding on desktop. Icon-only actions SHALL use the same height and square width. Narrow layouts SHALL provide at least 44px targets. Primary, secondary and destructive emphasis MUST NOT change geometry. Text labels may wrap when constrained rather than clip. Navigation, inline template/duration chips, message-row actions and selectable cards are distinct control types, not priority-based size variants.
#### Scenario: Comparable actions across workspaces
- **WHEN** an operator visits catalogs, progression, settings, live toolbars, Studio or dialogs at desktop width
- **THEN** ordinary actions share geometry regardless of emphasis or workspace
- **AND** primary confirmation is green, secondary actions neutral and destructive actions red
#### Scenario: Narrow translated actions
- **WHEN** the viewport is narrow and labels are Russian or English
- **THEN** actions provide at least 44px targets and remain reachable without clipped text
### Requirement: Catalog editors share semantic form sections
Greetings, awards and commands SHALL group related fields using shared neutral thin-border sections, spacing and heading typography. Commands SHALL show action-specific groups only when applicable. Browser-default fieldset decoration MUST NOT determine the section appearance.
#### Scenario: Edit related catalog entries
- **WHEN** an operator switches between greetings, awards and commands
- **THEN** equivalent content, media and appearance groups use the same visual treatment
- **AND** field labels, IDs, validation associations, preview, save and dirty-navigation behavior remain intact
### Requirement: Admin visual primitives share semantic styling
Admin fields, labels, hints, panel headings, chips, checkbox and range controls SHALL use consistent semantic typography, palette, spacing and states. Workspace layout MAY vary by task. Ordinary action styling MUST remain consistent for upload-label and button elements.
#### Scenario: Native and template controls
- **WHEN** an operator edits media or inserts a template variable
- **THEN** the controls use the established palette in normal, hover, focus and disabled states without undeclared token fallbacks
#### Scenario: Loading and error recovery
- **WHEN** a form is busy, invalid, offline or retried
- **THEN** existing disabled, error, retry and focus behavior remains available with shared visual styling

#### Scenario: Read action tooltips
- **WHEN** an operator hovers or keyboard-focuses an action such as Recap or New stream
- **THEN** its tooltip uses content-based width bounded by the viewport rather than shrinking to the button width
- **AND** ordinary words wrap at natural boundaries; only overlong unbroken tokens may split to prevent overflow
- **AND** Live and Audience toolbar tooltips remain inside the viewport at desktop and narrow widths
