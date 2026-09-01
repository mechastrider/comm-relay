# Admin Console And OBS Dock

## Purpose

Gives the streamer a local admin console to connect platforms and style OBS, plus a messages-only Custom Browser Dock that is not part of the program output.

## Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide OBS source URLs including `/overlay/alert`, surface presets, preview, and appearance editing. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, diagnostics, about information, and implemented data-management controls.

#### Scenario: Open admin without a route
- **WHEN** the operator opens `/` without a recognized hash route
- **THEN** the Live workspace is selected and current navigation state is exposed accessibly

#### Scenario: Navigate with browser history
- **WHEN** the operator moves between workspaces and uses browser Back or Forward
- **THEN** the workspace matching the restored hash becomes active without a full page reload

#### Scenario: Copy overlay URL
- **WHEN** the operator opens Studio source setup
- **THEN** the UI shows overlay, leaderboard, and dock URLs for the current listen address and can copy them

#### Scenario: Copy alert URL
- **WHEN** the operator opens Studio source setup and selects Alerts
- **THEN** the UI shows a copyable `/overlay/alert` URL for the current listen address and the source is not a disabled placeholder

#### Scenario: Hide command messages
- **WHEN** the operator enables hide command messages and saves
- **THEN** `POST /api/config/update` persists `hide_command_messages` true

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

#### Scenario: Leaderboard uses the same backdrops
- **WHEN** the operator switches the Studio preview to Leaderboard and chooses checkerboard
- **THEN** the preview iframe loads the leaderboard page with `preview_background=checker`

### Requirement: OBS setup lists sources instead of a card grid
Studio source setup SHALL list on-stream Browser Sources and operator-only docks as a selectable list, not a growing grid of full setup cards. Selecting a source SHALL show that source's URL, copy control, and source-specific options. Browser Source install steps SHALL appear once as shared help, not repeated per source. Alerts SHALL appear as a working Browser Source with a copyable `/overlay/alert` URL.

#### Scenario: Select leaderboard
- **WHEN** the operator selects Leaderboard in the source list
- **THEN** the detail pane shows the leaderboard URL, a period control, and copy, without a third full-width how-to card

#### Scenario: Select alerts
- **WHEN** the operator selects Alerts in the source list
- **THEN** the detail pane shows a copyable `/overlay/alert` URL for the current listen address

#### Scenario: Dock stays operator-only
- **WHEN** the operator selects the message dock
- **THEN** the UI shows the dock URL and Custom Browser Dock help, and MUST NOT apply overlay theme controls to that URL

### Requirement: Appearance studio previews the selected on-stream surface
The Studio preview SHALL keep one preset island (theme and shared style) and SHALL switch the preview between Chat and Leaderboard. Changing the surface MUST retarget the preview iframe and MUST show only settings that apply to that surface (chat queue/TTL/platform marker versus leaderboard period, font override, and layout). Preview messages and ranking rows MUST be fictitious samples, not live chat or live viewer stats. A Replay control SHALL reload the sample for the selected surface.

#### Scenario: Switch to leaderboard preview
- **WHEN** the operator selects Leaderboard in the appearance studio
- **THEN** the preview iframe loads `/overlay/leaderboard` with `preview=sample` and the current unsaved appearance query, showing a fictitious top-5

#### Scenario: Chat preview unchanged in kind
- **WHEN** the operator selects Chat in the appearance studio
- **THEN** the preview iframe loads `/overlay` with `preview=sample` (or live chat if that existing mode is chosen) and does not embed the leaderboard

#### Scenario: Per-surface font
- **WHEN** the operator sets a leaderboard font size different from the preset chat font size and the preview is on Leaderboard
- **THEN** the preview reflects the leaderboard font size without changing the chat font shown when switching back to Chat

### Requirement: New stream requires confirmation
The admin chrome SHALL offer a New stream action. The system MUST NOT start a new session until the operator confirms. After success, session counters on the Audience view and session leaderboard SHALL reset while day and all-time counters remain.

#### Scenario: Accidental click
- **WHEN** the operator activates New stream and dismisses the confirmation
- **THEN** the current session stays open and session counters are unchanged

#### Scenario: Confirmed new stream
- **WHEN** the operator confirms New stream
- **THEN** the client calls `POST /api/sessions/start` and session totals on the Audience view are empty

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

### Requirement: Audience hosts two catalogs
Audience SHALL offer Commands and Awards lists separate from the viewers people workspace. Each catalog SHALL support create, edit, enable (commands), cooldown (commands), points (awards), splash text, sound, and delete. Catalog editors MUST NOT appear in the dock.

#### Scenario: Open commands
- **WHEN** the operator opens Audience Commands
- **THEN** seeded or operator-defined commands are listed and can be edited without leaving `/`

### Requirement: Messages offer Reward next to delete
Live Messages and `/dock/messages` SHALL show a Reward control on rows that have a stable `user_id`, in addition to delete when a source `id` exists. Reward SHALL open a picker of award types, not a stack of per-type buttons on the row. The picker MUST be usable in a height-capped dock: header stays put, the list scrolls.

#### Scenario: Reward then delete still available
- **WHEN** a message has both source `id` and `user_id`
- **THEN** both Delete and Reward are available
