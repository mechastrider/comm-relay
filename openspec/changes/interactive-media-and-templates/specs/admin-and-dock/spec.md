## Purpose

Let the operator set a streamer display name and customize command and award splashes with media, layout, and template variables.

## MODIFIED Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views, including the hot active-preset control. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide a surface-centric preview and appearance editor, Publish for overlay drafts, and Add to OBS for OBS source URLs including `/overlay/alert` and `/dock/messages`. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, `streamer_display_name`, diagnostics, about information, and implemented data-management controls.

#### Scenario: Open admin without a route
- **WHEN** the operator opens `/` without a recognized hash route
- **THEN** the Live workspace is selected and current navigation state is exposed accessibly

#### Scenario: Navigate with browser history
- **WHEN** the operator moves between workspaces and uses browser Back or Forward
- **THEN** the workspace matching the restored hash becomes active without a full page reload

#### Scenario: Copy overlay URL
- **WHEN** the operator opens Studio and uses the primary copy action for chat or copies chat from Add to OBS
- **THEN** the UI shows overlay, leaderboard, and dock URLs for the current listen address (dock via Add to OBS) and can copy them

#### Scenario: Copy alert URL
- **WHEN** the operator opens Studio and selects Alerts (surface or Add to OBS)
- **THEN** the UI shows a copyable `/overlay/alert` URL for the current listen address and the source is not a disabled placeholder

#### Scenario: Hide command messages
- **WHEN** the operator enables hide command messages and saves
- **THEN** `POST /api/config/update` persists `hide_command_messages` true

#### Scenario: Save connections
- **WHEN** the operator enables Twitch with a channel and saves
- **THEN** `POST /api/config/update` persists those settings and the Twitch connector picks them up without a process restart

#### Scenario: Save streamer name
- **WHEN** the operator saves streamer display name `Jake` in Settings
- **THEN** `POST /api/config/update` persists `streamer_display_name` `Jake`

### Requirement: Audience hosts two catalogs
Audience SHALL offer Commands and Awards lists separate from the viewers people workspace. Each catalog SHALL support create, edit, enable (commands), cooldown (commands), points (awards), splash text, sound, custom image, custom sound file, volume, layout, and delete. Catalog editors MUST NOT appear in the dock.

#### Scenario: Open commands
- **WHEN** the operator opens Audience Commands
- **THEN** seeded or operator-defined commands are listed and can be edited without leaving `/`

## ADDED Requirements

### Requirement: Catalog editors expose templates, media, and layout
Command and award editors SHALL show the available template variables `{viewer}`, `{name}`, `{streamer}`, `{points}`, and `{message}`, insert the chosen variable into the splash field on activation, and show a preview that substitutes sample viewer `Alice`, the current `streamer_display_name` or a localized sample streamer name when empty, sample points, and a short sample message. Image upload SHALL use `kind` `alert_image` and offer a clear action. Sound SHALL keep the built-in select plus an optional custom file using `kind` `alert_sound`, a Play/Stop preview, and a volume control 0–100. Layout SHALL be a choice of card, banner, or fullscreen. File inputs MUST remain keyboard reachable and labeled.

#### Scenario: Insert viewer variable
- **WHEN** the operator activates `{viewer}` in the command editor
- **THEN** `{viewer}` is inserted into the splash template field

#### Scenario: Preview uses streamer name
- **WHEN** `streamer_display_name` is `Jake` and the template contains `{streamer}`
- **THEN** the editor preview contains `Jake`
