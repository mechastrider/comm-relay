## Purpose

Expose automatic greeting configuration and per-viewer suppression in the existing Audience workspace.

## ADDED Requirements

### Requirement: Audience contains a dedicated Greetings catalog
Audience SHALL add a `Greetings` tab between `Commands` and `Awards`. Its desktop layout MUST reuse the catalog list/editor pattern: a left list containing fixed `New viewer` and `Returning viewer` rows and a right editor for the selected definition. Rows MUST show name, trigger summary, and enabled state. The catalog MUST NOT expose Create or Delete actions.

#### Scenario: Open Greetings
- **WHEN** the operator activates Audience → Greetings
- **THEN** both fixed definitions are listed and selecting one opens its editor

#### Scenario: Narrow viewport
- **WHEN** the Greetings tab is used at the admin's narrow-layout breakpoint
- **THEN** the selected editor is reachable without horizontal scrolling and its final fields are not covered by actions

### Requirement: Greeting editor mirrors alert-command presentation controls
The editor SHALL expose a visible Enabled control, read-only trigger explanation, splash template and preview, applicable variable chips, built-in sound, uploaded image and sound controls, volume, layout, image fit, image size, and duration. It MUST omit trigger, command action, cooldown, Create, and Delete controls. Save MUST disable while in flight, show field errors adjacent to invalid controls, focus the first invalid field, and preserve unsaved input after a recoverable failure.

#### Scenario: Edit returning greeting
- **WHEN** the operator changes the returning-viewer template and media and saves valid values
- **THEN** the saved definition is reflected in the list and future qualifying greetings

#### Scenario: Invalid duration
- **WHEN** the operator submits an invalid duration
- **THEN** the editor keeps their other values, announces the duration error, and focuses that field

### Requirement: Template variables are discoverable and bounded
Greeting templates SHALL offer insert controls for `{viewer}`, `{streamer}`, and `{message}` and MUST NOT offer `{points}`. Each variable control MUST have a localized accessible name and hover/focus explanation. Preview text MUST use safe text rendering and representative values.

#### Scenario: Keyboard variable insertion
- **WHEN** a keyboard user activates the `{viewer}` insert control
- **THEN** `{viewer}` is inserted at the current template selection and its purpose is available without pointer hover

### Requirement: Unsaved admin drafts use an application confirmation dialog
The admin SHALL use its shared, styled `<dialog>` confirmation rather than a native browser confirmation for every action that discards unsaved changes. The Greeting catalog and editable Settings sections MUST use this dialog. It SHALL explain that the current draft will be lost, offer a safe cancel action and an explicit discard action, restore focus to the initiating control after cancel, and prevent the discarded navigation or reset when canceled.

#### Scenario: Keep greeting draft
- **WHEN** the operator edits a greeting and selects another greeting, then chooses to keep editing
- **THEN** the application dialog closes, focus returns to the selected catalog row, and the current greeting draft remains unchanged

#### Scenario: Discard Settings section draft
- **WHEN** the operator edits a Settings section and changes section or chooses Reset, then confirms discard
- **THEN** the application dialog closes and the selected section or baseline reset proceeds without a native browser dialog

### Requirement: Test uses the isolated alert test audience
The editor SHALL provide a visibly labelled Test action that uses the current unsaved form values and representative viewer data. Test MUST target only the dedicated overlay-debug alert audience, MUST NOT broadcast to production `/ws`, consume greeting eligibility, update settings, or write interaction history, and SHALL report whether any test receiver accepted the frame.

#### Scenario: Test unsaved greeting
- **WHEN** the operator changes the template without saving and activates Test while a Studio alert test receiver is connected
- **THEN** that receiver displays the draft greeting and production alert clients receive nothing

#### Scenario: No test receiver
- **WHEN** Test completes with no overlay-debug alert receiver
- **THEN** the editor explains how to open the Studio alert test preview without treating the greeting as delivered

### Requirement: Viewer detail can suppress automatic greetings
The Audience viewer inspector SHALL expose `Exclude from automatic greetings` beside the existing leaderboard visibility preference, with persistent helper text explaining that it affects both greeting types. Saving the control MUST update that canonical viewer and MUST NOT trigger a greeting immediately when exclusion is removed.

#### Scenario: Exclude a bot
- **WHEN** the operator enables greeting exclusion for a viewer
- **THEN** the saved state remains visible after reopening the viewer and future qualifying messages are silent
