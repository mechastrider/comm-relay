## MODIFIED Requirements

### Requirement: Admin console manages connections, OBS setup, and appearance
The admin page at `/` SHALL provide connection forms for Twitch, YouTube, VK, and network proxy; OBS source URLs for chat overlay, leaderboard, and dock; overlay appearance including presets and a Chat / Leaderboard preview switch; interface language, message sound, `points_per_message`, and `day_reset_hour`; a Monitor versus Viewers main canvas; a New stream control; viewer search, cards, and merge; diagnostics; and an about dialog.

#### Scenario: Copy overlay URL
- **WHEN** the operator opens OBS setup and selects the chat source
- **THEN** the UI shows the chat overlay URL for the current listen address, including `preset` when a preset is selected, and can copy it

#### Scenario: Copy leaderboard URL
- **WHEN** the operator opens OBS setup and selects the leaderboard source
- **THEN** the UI shows the leaderboard URL for the current listen address with `preset` and `period` and can copy it

#### Scenario: Save connections
- **WHEN** the operator enables Twitch with a channel and saves
- **THEN** `POST /api/config/update` persists those settings and the Twitch connector picks them up without a process restart

### Requirement: Appearance preview offers a shared backdrop set
The OBS Appearance preview SHALL let the operator choose a backdrop from white, checkerboard, game footage, and black. Labels MUST describe contrast purpose (not an uploaded OBS scene). The preview iframe MUST pass the matching `preview_background` query value for the selected on-stream surface. Stored preference `busy` MUST map to game footage.

#### Scenario: Backdrop options
- **WHEN** the operator opens the overlay appearance preview background control
- **THEN** the options are white, checkerboard, game footage, and black, in that order

#### Scenario: Restored busy preference
- **WHEN** a previously stored preview background value is `busy`
- **THEN** the control shows game footage and the iframe uses `preview_background=scene`

#### Scenario: Leaderboard uses the same backdrops
- **WHEN** the operator switches the appearance preview to Leaderboard and chooses checkerboard
- **THEN** the preview iframe loads the leaderboard page with `preview_background=checker`

## ADDED Requirements

### Requirement: OBS setup lists sources instead of a card grid
The OBS Connection (setup) tab SHALL list on-stream Browser Sources and operator-only docks as a selectable list, not a growing grid of full setup cards. Selecting a source SHALL show that source's URL, copy control, and source-specific options. Browser Source install steps SHALL appear once as shared help, not repeated per source. `/overlay/alert` MAY appear as a disabled placeholder and MUST NOT be offered as a working URL.

#### Scenario: Select leaderboard
- **WHEN** the operator selects Leaderboard in the source list
- **THEN** the detail pane shows the leaderboard URL, a period control, and copy, without a third full-width how-to card

#### Scenario: Banners are not ready
- **WHEN** the operator views the source list
- **THEN** a banners or alerts row is visible and disabled, with no copyable `/overlay/alert` URL

#### Scenario: Dock stays operator-only
- **WHEN** the operator selects the message dock
- **THEN** the UI shows the dock URL and Custom Browser Dock help, and MUST NOT apply overlay theme controls to that URL

### Requirement: Appearance studio previews the selected on-stream surface
The OBS Appearance tab SHALL keep one preset island (theme and shared style) and SHALL switch the preview between Chat and Leaderboard. Changing the surface MUST retarget the preview iframe and MUST show only settings that apply to that surface (chat queue/TTL/platform marker versus leaderboard period, font override, and layout). Preview messages and ranking rows MUST be fictitious samples, not live chat or live viewer stats. A Replay control SHALL reload the sample for the selected surface.

#### Scenario: Switch to leaderboard preview
- **WHEN** the operator selects Leaderboard in the appearance studio
- **THEN** the preview iframe loads `/overlay/leaderboard` with `preview=sample` and the current unsaved appearance query, showing a fictitious top-5

#### Scenario: Chat preview unchanged in kind
- **WHEN** the operator selects Chat in the appearance studio
- **THEN** the preview iframe loads `/overlay` with `preview=sample` (or live chat if that existing mode is chosen) and does not embed the leaderboard

#### Scenario: Per-surface font
- **WHEN** the operator sets a leaderboard font size different from the preset chat font size and the preview is on Leaderboard
- **THEN** the preview reflects the leaderboard font size without changing the chat font shown when switching back to Chat
