## ADDED Requirements

### Requirement: Audited compact and accessible controls
Admin controls SHALL retain readable labels and valid accessible names/roles across compact and desktop layouts. Small muted hint text SHALL meet WCAG AA contrast of 4.5:1 on its actual backgrounds.

#### Scenario: Collapsed Studio becomes compact
- **WHEN** a previously collapsed Studio rail is displayed at a compact width
- **THEN** the OBS setup label has positive width inside its button without overlap

#### Scenario: Screen reader encounters inspector and catalogs
- **WHEN** the operator opens a desktop viewer inspector, progression lists or named media preview
- **THEN** the nonmodal inspector has valid complementary semantics, both lists have heading-derived names, and preview names belong to semantic groups
- **AND** the progression list options can be reached with Arrow, Home and End keys

#### Scenario: Operator reads hints
- **WHEN** Settings, Studio, archive or greeting hints are rendered
- **THEN** their computed small-text contrast is at least 4.5:1
