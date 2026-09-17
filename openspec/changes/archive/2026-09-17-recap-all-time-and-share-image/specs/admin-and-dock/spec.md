## Purpose

Let the operator choose the recap window and download an opaque share image from Live without changing dock behavior.

## ADDED Requirements

### Requirement: Recap dialog switches session and all-time windows
The Recap dialog Current stream view SHALL offer a keyboard-reachable window switch between session recap and all-time status. Choosing session SHALL use the existing Show recap confirmation and capture rules. Choosing all-time SHALL show all-time on `/overlay/recap` without a capture confirmation and MUST NOT claim that a snapshot was stored. While recap is visible, switching windows MUST NOT start a new stream. History view MUST NOT gain an on-air all-time replay action.

#### Scenario: Show all-time from an uncaptured session
- **WHEN** Current stream has no snapshot and the operator selects all-time and shows it
- **THEN** overlay becomes visible with all-time status
- **AND** the dialog still reports that this session has no stored recap

#### Scenario: Capture confirmation is session-only
- **WHEN** the operator shows the session window for the first time
- **THEN** the existing permanence confirmation still appears
- **AND** showing all-time does not open that confirmation

### Requirement: Recap dialog can download an opaque share image
The Recap dialog SHALL provide a **Download image** action for the window currently selected in that dialog. The action SHALL encode a 16:9 PNG with an opaque background from the selected presentation data (session snapshot when session is selected and stored; live all-time presentation when all-time is selected). It MUST NOT capture the transparent OBS recap source. The file SHALL download locally. Failure MUST leave recap visibility and stored snapshots unchanged and produce an accessible error. `/dock/messages` MUST NOT gain download or recap-window controls.

#### Scenario: Download session card after capture
- **WHEN** a session snapshot exists, the dialog window is session, and the operator downloads the image
- **THEN** a PNG file is saved
- **AND** every pixel of the card background is opaque

#### Scenario: Download all-time without capture
- **WHEN** no session snapshot exists, the dialog window is all-time, and the operator downloads the image
- **THEN** a PNG file is saved from current all-time totals and ranking
- **AND** no `stream_recaps` row is created

#### Scenario: Download unavailable for session before capture
- **WHEN** the dialog window is session and no snapshot is stored
- **THEN** Download image is unavailable or explains that the session recap has not been captured
- **AND** all-time download remains available
