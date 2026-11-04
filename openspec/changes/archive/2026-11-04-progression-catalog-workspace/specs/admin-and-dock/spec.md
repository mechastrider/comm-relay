## ADDED Requirements

### Requirement: Progression uses a focused catalog workspace
Progression SHALL offer a labelled Levels/Achievements switch and show one catalog with a list and selected-item editor, consistent with Commands and Greetings. List rows SHALL summarize level XP thresholds or achievement conditions and enabled state. Search and achievement filters SHALL remain available. Editor actions and feedback SHALL be visible near the edited object. At narrow widths the workspace SHALL show a list or editor with an explicit return action.

#### Scenario: Switch catalogs
- **WHEN** the operator switches between Levels and Achievements
- **THEN** only that catalog and its editor are shown
- **AND** previous selections and achievement search/filter remain available during the visit

#### Scenario: Leave a dirty editor
- **WHEN** the operator selects another record, switches catalogs, returns to the list or navigates away with unsaved edits
- **THEN** the app asks before discarding those edits
- **AND** cancelling preserves the draft and current view

#### Scenario: Edit in a narrow or short window
- **WHEN** the operator selects a record in a narrow window
- **THEN** the editor replaces the list and offers a labelled return action
- **AND** fields remain reachable by scrolling and editor actions stay accessible

#### Scenario: Save or preview fails
- **WHEN** saving or previewing an item fails
- **THEN** the editor displays the failure near its actions and retains the draft
- **AND** field validation errors remain associated with their inputs

### Requirement: Progression alert settings are directly accessible
Progression SHALL expose a labelled Alerts button above its catalog. It SHALL open shared alert settings in a bounded dialog with a scrolling body and visible save/close actions. Dismissal with unsaved settings SHALL require confirmation, including Escape and backdrop dismissal. Reconciliation SHALL be presented separately from appearance settings with an explanation. Editors SHALL indicate when global alerts are disabled for their kind.

#### Scenario: Configure shared alerts
- **WHEN** the operator opens Alerts without scrolling through a catalog
- **THEN** the dialog offers existing global enablement, layout, sound, volume and duration controls
- **AND** saving uses the existing settings contract and reports the outcome inside the dialog

#### Scenario: Cancel closing unsaved settings
- **WHEN** the operator dismisses a dirty settings dialog and cancels discard confirmation
- **THEN** the dialog and its draft remain open

#### Scenario: Global alerts disabled
- **WHEN** the operator edits a level or achievement whose global alert switch is disabled
- **THEN** the editor explains why its individual announcement setting will not produce an alert
