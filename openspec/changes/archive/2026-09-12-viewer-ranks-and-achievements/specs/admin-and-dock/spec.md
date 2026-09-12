## Purpose

Add progression administration and viewer presentation to the existing Audience workspace without expanding the operator dock.

## ADDED Requirements

### Requirement: Audience provides a dedicated progression workspace
Audience SHALL expose top-level tabs in the order Viewers, Journal, Progression, Commands, Greetings, and Awards. Progression SHALL contain Achievements, Levels, and Unlock alerts sections. The tab strip MUST scroll horizontally at constrained widths and bring the selected tab into view without wrapping or clipping its accessible label.

#### Scenario: Open progression after greetings shipped
- **WHEN** the operator opens Audience and selects Progression
- **THEN** the existing Greetings tab remains available and the progression sections load without leaving Audience

#### Scenario: Narrow window
- **WHEN** all six Audience tabs do not fit the available width
- **THEN** the strip scrolls horizontally and keyboard focus plus selected state remain visible

### Requirement: Achievement administration uses the catalog editor pattern
The Achievements section SHALL provide a searchable and filterable catalog list beside a detail editor. Rows SHALL summarize the condition and expose enabled, secret, and repeatable states. The editor SHALL group identity, condition, and behavior fields, show a readable condition preview, validate inline, and provide Save, Delete, and Test unlock actions. Changing a rule field MUST require confirmation that a new revision and silent reconciliation will be created. Test unlock MUST use only the isolated debug audience and MUST NOT save a dirty draft.

#### Scenario: Test a dirty achievement draft
- **WHEN** the operator edits an achievement presentation and chooses Test unlock
- **THEN** the draft is previewed on connected debug alert overlays without persistence or production broadcast

#### Scenario: Save a condition change
- **WHEN** the operator confirms changing the metric or target
- **THEN** the new revision is saved, reconciliation progress is reported, and the selected row remains active

### Requirement: Level administration preserves a valid ordered catalog
The Levels section SHALL use the same list-and-editor pattern, display rows automatically ordered by ascending XP threshold, and provide title, minimum all-time XP, announce, Save, Delete, and Test level-up controls. It MUST NOT provide drag reorder. The baseline row SHALL allow renaming but its threshold and delete action MUST be unavailable.

#### Scenario: Duplicate threshold
- **WHEN** the operator saves a second level with an existing `min_xp`
- **THEN** an inline threshold error is shown and the catalog remains unchanged

### Requirement: Unlock alert settings are shared and testable
The Unlock alerts section SHALL configure global achievement and level notification toggles plus shared layout, built-in sound or silence, volume, and duration. It SHALL provide separate isolated Test achievement and Test level-up actions. Per-achievement custom media MUST NOT be offered in this change.

#### Scenario: Preview level alert settings
- **WHEN** the operator changes sound and duration without saving and chooses Test level-up
- **THEN** the complete bounded draft is sent only to the debug overlay audience

### Requirement: Viewer surfaces summarize progression
Viewer directory rows SHALL show the current title as a compact badge or secondary line without adding a table column or sort mode. Viewer detail SHALL show the current title, an accessible progress bar toward the next level, unlocked achievements with repeat counts, non-secret in-progress achievements, and a `Do not show progression alerts for this viewer` control. Live progression frames SHALL refresh the affected visible row and card without a full reload.

#### Scenario: Maximum level
- **WHEN** a viewer is at the highest configured level
- **THEN** the card identifies that title and presents completion without inventing a next threshold

#### Scenario: Accessible progress
- **WHEN** a viewer has 720 of 1500 XP toward the next title
- **THEN** the progress indicator exposes the current value, maximum, and textual title context to assistive technology

### Requirement: Progression adds no permanent Live or dock surface
The Live workspace and `/dock/messages` MUST NOT gain a permanent progression panel, filter, or action. Existing live messages, leaderboard controls, and dock behavior SHALL remain available.

#### Scenario: Open messages dock
- **WHEN** the operator loads `/dock/messages` after progression is enabled
- **THEN** it remains a messages-only log and ignores progression frames
