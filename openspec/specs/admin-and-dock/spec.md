# Admin Console And OBS Dock

## Purpose

Gives the streamer a local admin console to connect platforms and style OBS, plus a messages-only Custom Browser Dock that is not part of the program output.

## Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows. Studio SHALL provide OBS source URLs, surface presets, preview, and appearance editing. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, diagnostics, about information, and implemented data-management controls.

#### Scenario: Open admin without a route
- **WHEN** the operator opens `/` without a recognized hash route
- **THEN** the Live workspace is selected and current navigation state is exposed accessibly

#### Scenario: Navigate with browser history
- **WHEN** the operator moves between workspaces and uses browser Back or Forward
- **THEN** the workspace matching the restored hash becomes active without a full page reload

#### Scenario: Copy overlay URL
- **WHEN** the operator opens Studio source setup
- **THEN** the UI shows overlay, leaderboard, and dock URLs for the current listen address and can copy them

#### Scenario: Save connections
- **WHEN** the operator enables Twitch with a channel and saves
- **THEN** `POST /api/config/update` persists those settings and the Twitch connector picks them up without a process restart

### Requirement: Interface language is Russian or English
Admin and dock SHALL share locale catalogs. The operator MAY choose Russian or English in Interface settings. Time display SHALL use a 24-hour clock (`ru-RU` or `en-GB`) without AM/PM.

#### Scenario: Switch language
- **WHEN** the operator selects English
- **THEN** admin chrome and dock empty-state copy render in English

### Requirement: Dock is a messages-only live log
`/dock/messages` SHALL show a compact live list, restore up to 100 recent messages, preserve manual scroll position near the threshold, and reconnect on WebSocket drop (backoff 500 ms to 10 s). The dock MUST NOT be required on the program overlay URL.

#### Scenario: Dock reload
- **WHEN** the dock page loads with history available
- **THEN** up to 100 recent messages are shown and new `/ws` messages append

### Requirement: Deletion controls appear only for stable source IDs
Admin and dock SHALL offer delete only when a message has a non-empty platform plus source `id`. Deletion SHALL call `POST /api/messages/delete` and then remove the row when `message_deleted` arrives.

#### Scenario: Message with id
- **WHEN** a Twitch message with a source id is shown in admin
- **THEN** a delete control is available

#### Scenario: Message without id
- **WHEN** a displayed line has no stable source id
- **THEN** the UI does not invent a fallback id for deletion

### Requirement: Admin new-message sound is optional
When message sound is enabled, the admin console SHALL play the selected preset on a new live message after the browser has allowed audio. Sound MUST NOT wait until the settings dialog is opened.

#### Scenario: Sound enabled
- **WHEN** message sound is enabled and a new chat event arrives
- **THEN** the selected sound plays without opening Interface settings

### Requirement: Appearance preview offers a shared backdrop set
The Studio preview SHALL let the operator choose a backdrop from white, checkerboard, game footage, and black. Labels MUST describe contrast purpose rather than an uploaded OBS scene. The preview iframe MUST pass the matching `preview_background` query value. Stored preference `busy` MUST map to game footage.

#### Scenario: Backdrop options
- **WHEN** the operator opens the Studio preview background control
- **THEN** the options are white, checkerboard, game footage, and black, in that order

#### Scenario: Restored busy preference
- **WHEN** a previously stored preview background value is `busy`
- **THEN** the control shows game footage and the iframe uses `preview_background=scene`

### Requirement: Admin actions expose their persistence timing
The admin SHALL distinguish hot actions that apply immediately, Studio fields that remain local until Publish, and Settings forms that remain local until Save. The UI MUST NOT present one global Save action for unrelated workspaces.

#### Scenario: Hot preset selection
- **WHEN** the operator selects a different active preset in a Live or Studio hot control
- **THEN** the activation request starts immediately, the initiating control shows progress, and success or failure is reported without requiring Publish or Save

#### Scenario: Edit Studio draft
- **WHEN** the operator changes a preset appearance field
- **THEN** Studio preview reflects the draft while the live overlay remains unchanged and Publish becomes available

#### Scenario: Leave dirty Studio draft
- **WHEN** the operator navigates away or closes the page with unpublished Studio edits
- **THEN** the UI asks for confirmation before discarding those edits

#### Scenario: Edit cold setting
- **WHEN** the operator changes language, sound, platform, proxy, or another Settings field
- **THEN** the persisted configuration remains unchanged until the relevant Save action succeeds

### Requirement: Live status reports only observable application facts
Live SHALL summarize connector state, WebSocket browser-client count, and current session data using available status and viewer APIs. It MUST NOT claim that an OBS source is visible, active in a scene, or healthy without OBS integration.

#### Scenario: Browser Source client connects
- **WHEN** a WebSocket client is counted by CommRelay
- **THEN** the console labels it as a connected overlay or browser client rather than an OBS scene-visibility signal

#### Scenario: No historical samples exist
- **WHEN** the operator opens current Statistics and only aggregate viewer/session data is available
- **THEN** the console shows supported current aggregates and does not fabricate a historical time-series chart

### Requirement: Existing capabilities remain reachable after redesign
Every workflow available before the redesign SHALL remain reachable from one of the four workspaces or an associated dialog, including message deletion, sound, localization, platform connection, proxy, diagnostics, about, viewer detail/merge, new stream, preset management, asset upload, and OBS URL copy.

#### Scenario: Feature inventory smoke check
- **WHEN** the redesigned console is loaded with all supported connectors and viewer storage enabled
- **THEN** each implemented pre-redesign workflow has a visible entry point and no mock-only command or splash control is presented as functional
