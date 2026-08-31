## Purpose

Studio becomes a surface-centric preparation workspace: one on-stream selection drives preview, layered appearance, and the primary OBS URL. First-run Browser Source help and the operator-only dock live in Add to OBS, not beside theme controls.

## ADDED Requirements

### Requirement: Studio selection is a single on-stream surface
Studio SHALL keep one selected on-stream surface among chat, leaderboard, and alerts. That selection MUST retarget the preview iframe, MUST show only inspector fields that apply to that surface, and MUST bind the primary Follow-active copy action to that surface's URL. Studio MUST NOT keep a second independent surface or source selector that can disagree with the preview.

The surface selector SHALL expose icon and text labels with a non-color selected cue. On wide viewports it SHALL be collapsible to an icon rail and remember that local preference. On compact viewports it SHALL remain a horizontal labeled selector regardless of the wide-layout preference.

#### Scenario: Select leaderboard
- **WHEN** the operator selects the leaderboard surface
- **THEN** the preview iframe loads `/overlay/leaderboard` with `preview=sample` and the current unsaved appearance query, showing a fictitious top-5
- **AND** the primary copy action copies the leaderboard Follow-active URL
- **AND** chat-only queue fields are hidden and leaderboard period, font override, and layout are shown

#### Scenario: Select chat
- **WHEN** the operator selects the chat surface
- **THEN** the preview iframe loads `/overlay` with `preview=sample` (or live chat only if that mode is chosen from preview overflow)
- **AND** the preview does not embed the leaderboard or alert page

#### Scenario: Select alerts
- **WHEN** the operator selects the alerts surface
- **THEN** the preview iframe loads `/overlay/alert` with `preview=sample` and a fictitious splash
- **AND** the primary copy action copies the alert Follow-active URL

#### Scenario: Dock is not a themed surface
- **WHEN** the operator opens Studio's on-stream surface list
- **THEN** the list does not include the message dock as a previewable themed surface
- **AND** overlay theme controls MUST NOT apply to `/dock/messages`

#### Scenario: Collapse and restore the surface rail
- **WHEN** the operator collapses the surface selector on a wide viewport and later returns to Studio
- **THEN** the selector restores as an icon rail with accessible names and hover or focus tooltips
- **AND** the selected surface remains identifiable without relying on color alone

### Requirement: Studio offers Essentials and All settings density modes
Studio SHALL offer Essentials and All settings as two views of the same selected surface and the same in-memory draft. Switching modes MUST NOT reset the draft, surface selection, or scroll the page to the beginning. The local mode preference SHALL be restored on the next visit.

Essentials SHALL keep surface selection, preview, look selection, visual theme, selected-surface font, selected-surface timing or period, Publish, and OBS setup reachable. All settings SHALL additionally reveal raw and pinned URLs, preview dimensions and backdrop, Advanced appearance fields, and preset CRUD.

#### Scenario: Change mode with an unpublished draft
- **WHEN** the operator changes a theme in Essentials, switches to All settings, and returns to Essentials
- **THEN** the same unpublished theme remains in the draft and preview
- **AND** no server update or preset activation occurs because of the mode switch

### Requirement: Studio inspector discloses appearance in layers
The Studio inspector SHALL show essential look controls first: a visual theme picker for the supported overlay themes, font size for the selected surface, and chat message duration when chat is selected. Every appearance control that exists today SHALL remain reachable under an explicit More or Advanced disclosure, including spacing, platform marker, text edge, font family, line height, panel color and opacity, panel image and fit, borders, queue cap, reset-to-theme, and preset add/rename/duplicate/delete.

#### Scenario: First inspector view
- **WHEN** the operator opens Studio with a published single-look configuration and chat selected
- **THEN** theme, chat font size, and message duration are visible without opening Advanced
- **AND** panel image, text-edge strength, and max-messages are not required to be visible until Advanced is opened

#### Scenario: Advanced retains customization
- **WHEN** the operator opens Advanced while chat is selected
- **THEN** the existing chat appearance fields remain available and still update the draft preview

#### Scenario: Duration chips map to TTL
- **WHEN** the operator chooses a chat duration of 8 seconds, 20 seconds, or until replaced
- **THEN** the draft `message_ttl_seconds` becomes 8, 20, or 0 respectively
- **AND** a stored TTL that is none of those values remains editable from Advanced without being silently rewritten

#### Scenario: Leaderboard period is one control
- **WHEN** the operator changes the leaderboard ranking period in Studio
- **THEN** that single control updates the leaderboard Follow-active and pinned URLs
- **AND** Studio MUST NOT present a second independent period selector for the same surface

### Requirement: Add to OBS is a dismissible setup sheet
Studio SHALL offer an Add to OBS sheet that contains Browser Source install steps once, Follow-active copy for chat, leaderboard, and alerts, pinned-copy access, the operator-only message dock URL and Custom Browser Dock help, and source-specific options such as leaderboard period. The sheet SHALL open on the first visit to Studio in that browser or desktop webview until the operator dismisses it, and MUST remain reopenable from Studio afterward. Shared Browser Source steps MUST NOT be repeated once per source.

Studio SHALL distinguish setup outcomes: closing the sheet only records that it was seen, Later records a skipped state, and Done records completion. Seen and skipped states SHALL keep a compact setup reminder in Essentials; completion SHALL hide that reminder. A persistent OBS setup action SHALL reopen the sheet in every state. Existing dismissed boolean preferences SHALL migrate without unexpectedly reopening onboarding.

#### Scenario: First Studio visit
- **WHEN** the operator opens Studio and has not dismissed Add to OBS in that browser or webview
- **THEN** the sheet is shown with chat Browser Source steps and a chat Follow-active copy control

#### Scenario: Dismiss and reopen
- **WHEN** the operator dismisses Add to OBS and later opens the Add to OBS control
- **THEN** the sheet opens again with the same copyable URLs
- **AND** the next Studio visit in that browser or webview does not auto-open the sheet

#### Scenario: Close is not completion
- **WHEN** the operator closes the setup sheet with its close control, Escape, or backdrop
- **THEN** the sheet does not auto-open on the next visit
- **AND** Essentials keeps a compact OBS setup reminder that can reopen it

#### Scenario: Mark setup done
- **WHEN** the operator chooses Done
- **THEN** the compact reminder is hidden
- **AND** the persistent OBS setup action remains available

#### Scenario: Copy alert URL from Add to OBS
- **WHEN** the operator chooses Alerts in Add to OBS
- **THEN** the UI shows a copyable `/overlay/alert` URL for the current listen address and the source is not a disabled placeholder

#### Scenario: Dock stays operator-only
- **WHEN** the operator chooses the message dock in Add to OBS
- **THEN** the UI shows the dock URL and Custom Browser Dock help
- **AND** MUST NOT apply overlay theme controls to that URL

### Requirement: Studio edits a look; Live activates the on-air look
Studio SHALL NOT include a toolbar hot control that activates `overlay.active_preset_id`. Live SHALL keep the existing hot active-preset control. When the look being edited in Studio is not the active preset, Studio SHALL offer a Use on stream action that calls `POST /api/overlay/activate` with that look's `preset_id`. While only one overlay look exists, Studio MUST NOT require preset add/rename/duplicate/delete controls to be visible; those actions MUST remain reachable when more than one look exists or from an overflow menu.

#### Scenario: Single look
- **WHEN** the operator opens Studio with exactly one overlay preset
- **THEN** Publish is available for appearance drafts
- **AND** add/rename/duplicate/delete are not required in the primary inspector chrome

#### Scenario: Use on stream
- **WHEN** the operator is editing a non-active look and activates Use on stream
- **THEN** the client calls `POST /api/overlay/activate` with that look's `preset_id` when the Studio draft is clean
- **AND** progress and success or failure are reported on that control

#### Scenario: Unpublished look cannot activate stale settings
- **WHEN** the operator is editing a non-active look and Studio has unpublished changes
- **THEN** Use on stream is disabled
- **AND** the UI explains that the look must be published first

#### Scenario: Live still switches the on-air look
- **WHEN** the operator selects a different active preset in the Live hot control
- **THEN** the activation request starts immediately without requiring Studio Publish or Settings Save

## MODIFIED Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views, including the hot active-preset control. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide a surface-centric preview and appearance editor, Publish for overlay drafts, and Add to OBS for OBS source URLs including `/overlay/alert` and `/dock/messages`. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, diagnostics, about information, and implemented data-management controls.

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

### Requirement: Appearance preview offers a shared backdrop set
The Studio preview SHALL let the operator choose a backdrop from white, checkerboard, game footage, and black. Those controls MAY live in preview overflow rather than the always-visible canvas toolbar. Labels MUST describe contrast purpose rather than an uploaded OBS scene. The preview iframe MUST pass the matching `preview_background` query value. Stored preference `busy` MUST map to game footage.

#### Scenario: Backdrop options
- **WHEN** the operator opens the Studio preview background control
- **THEN** the options are white, checkerboard, game footage, and black, in that order

#### Scenario: Restored busy preference
- **WHEN** a previously stored preview background value is `busy`
- **THEN** the control shows game footage and the iframe uses `preview_background=scene`

#### Scenario: Leaderboard uses the same backdrops
- **WHEN** the operator switches Studio to Leaderboard and chooses checkerboard
- **THEN** the preview iframe loads the leaderboard page with `preview_background=checker`

### Requirement: Appearance studio previews the selected on-stream surface
The Studio preview SHALL follow the single selected on-stream surface. Changing the surface MUST retarget the preview iframe and MUST show only settings that apply to that surface (chat queue/TTL/platform marker versus leaderboard period, font override, and layout). Preview messages, ranking rows, and alert splashes MUST be fictitious samples by default, not live chat, live viewer stats, or live `/ws` alert frames. A Replay control SHALL reload the sample for the selected surface.

#### Scenario: Switch to leaderboard preview
- **WHEN** the operator selects Leaderboard
- **THEN** the preview iframe loads `/overlay/leaderboard` with `preview=sample` and the current unsaved appearance query, showing a fictitious top-5

#### Scenario: Chat preview unchanged in kind
- **WHEN** the operator selects Chat
- **THEN** the preview iframe loads `/overlay` with `preview=sample` (or live chat if that existing mode is chosen from preview overflow) and does not embed the leaderboard

#### Scenario: Per-surface font
- **WHEN** the operator sets a leaderboard font size different from the preset chat font size and the preview is on Leaderboard
- **THEN** the preview reflects the leaderboard font size without changing the chat font shown when switching back to Chat

### Requirement: Admin actions expose their persistence timing
The admin SHALL distinguish hot actions that apply immediately, Studio fields that remain local until Publish, and Settings forms that remain local until Save. The UI MUST NOT present one global Save action for unrelated workspaces. Studio appearance fields remain drafts until Publish. Activating a look from Live or from Studio Use on stream is a hot action.

#### Scenario: Hot preset selection
- **WHEN** the operator selects a different active preset in the Live hot control
- **THEN** the activation request starts immediately, the initiating control shows progress, and success or failure is reported without requiring Publish or Save

#### Scenario: Edit Studio draft
- **WHEN** the operator changes a preset appearance field
- **THEN** Studio preview reflects the draft while the live overlay remains unchanged and Publish becomes available

#### Scenario: Leave dirty Studio draft
- **WHEN** the operator navigates away or closes the page with unpublished Studio edits
- **THEN** in-app workspace navigation uses a localized CommRelay confirmation dialog before discarding those edits
- **AND** Cancel keeps the operator in Studio with the draft and previous focus intact
- **AND** browser reload or window close may use the browser-required native `beforeunload` prompt

#### Scenario: Edit cold setting
- **WHEN** the operator changes language, sound, platform, proxy, or another Settings field
- **THEN** the persisted configuration remains unchanged until the relevant Save action succeeds

## REMOVED Requirements

### Requirement: OBS setup lists sources instead of a card grid
Studio source setup SHALL list on-stream Browser Sources and operator-only docks as a selectable list, not a growing grid of full setup cards. Selecting a source SHALL show that source's URL, copy control, and source-specific options. Browser Source install steps SHALL appear once as shared help, not repeated per source. Alerts SHALL appear as a working Browser Source with a copyable `/overlay/alert` URL.

This independent source-list column is replaced by the on-stream surface list plus Add to OBS.

#### Scenario: Select leaderboard
- **WHEN** the operator selects Leaderboard in the source list
- **THEN** the detail pane shows the leaderboard URL, a period control, and copy, without a third full-width how-to card

#### Scenario: Select alerts
- **WHEN** the operator selects Alerts in the source list
- **THEN** the detail pane shows a copyable `/overlay/alert` URL for the current listen address

#### Scenario: Dock stays operator-only
- **WHEN** the operator selects the message dock
- **THEN** the UI shows the dock URL and Custom Browser Dock help, and MUST NOT apply overlay theme controls to that URL
