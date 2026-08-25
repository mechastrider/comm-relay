# Admin Console And OBS Dock

## Purpose

Gives the streamer a local admin console to connect platforms and style OBS, plus a messages-only Custom Browser Dock that is not part of the program output.

## Requirements

### Requirement: Admin console manages connections, OBS setup, and appearance
The admin page at `/` SHALL provide connection forms for Twitch, YouTube, VK, and network proxy; OBS setup URLs for overlay and dock; overlay appearance including presets; interface language and message sound; diagnostics; and an about dialog.

#### Scenario: Copy overlay URL
- **WHEN** the operator opens OBS setup
- **THEN** the UI shows the overlay and dock URLs for the current listen address and can copy them

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
The OBS Appearance preview SHALL let the operator choose a backdrop from white, checkerboard, game footage, and black. Labels MUST describe contrast purpose (not an uploaded OBS scene). The preview iframe MUST pass the matching `preview_background` query value. Stored preference `busy` MUST map to game footage.

#### Scenario: Backdrop options
- **WHEN** the operator opens the overlay appearance preview background control
- **THEN** the options are white, checkerboard, game footage, and black, in that order

#### Scenario: Restored busy preference
- **WHEN** a previously stored preview background value is `busy`
- **THEN** the control shows game footage and the iframe uses `preview_background=scene`
