## Purpose
Preserve self-contained runtime delivery with compiled admin assets.

## ADDED Requirements

### Requirement: Compiled admin is self-contained
The shipped local application SHALL serve the complete admin without Node or a frontend development server. Native file-save behavior SHALL remain available in the desktop shell.

#### Scenario: Launch packaged runtime
- **WHEN** a built runtime starts without a frontend development server
- **THEN** the admin, its assets, and the OBS pages load from the local runtime

#### Scenario: Native save cancelled
- **WHEN** an operator cancels the native PNG save dialog
- **THEN** no browser download is triggered and cancellation is not reported as a successful save
