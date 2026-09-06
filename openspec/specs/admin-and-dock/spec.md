# Admin Console And OBS Dock

## Purpose

Gives the streamer a local admin console to connect platforms and style OBS, plus a messages-only Custom Browser Dock that is not part of the program output.

## Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views, including the hot active-preset control. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide a surface-centric preview and appearance editor, Publish for overlay drafts, and Add to OBS for OBS source URLs including `/overlay/alert` and `/dock/messages`. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, `streamer_display_name`, activity XP settings, diagnostics, about information, and implemented data-management controls.

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

#### Scenario: Save activity settings
- **WHEN** the operator sets activity interval 120, session limit 5, and activity XP 2 and saves
- **THEN** `POST /api/config/update` persists those activity fields and they apply to new counted lines without a process restart

#### Scenario: Save streamer name
- **WHEN** the operator saves streamer display name `Jake` in Settings
- **THEN** `POST /api/config/update` persists `streamer_display_name` `Jake`

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
- **AND** Studio essentials show the preset alert image size slider (25–300 percent) and hide chat-only queue fields

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
The Studio preview SHALL follow the single selected on-stream surface. Changing the surface MUST retarget the preview iframe and MUST show only settings that apply to that surface (chat queue/TTL/platform marker versus leaderboard period, font override, and layout versus alerts portrait image size and alert font override). Preview messages, ranking rows, and alert splashes MUST be fictitious samples by default, not live chat, live viewer stats, or live `/ws` alert frames. A Replay control SHALL reload the sample for the selected surface.

#### Scenario: Switch to leaderboard preview
- **WHEN** the operator selects Leaderboard
- **THEN** the preview iframe loads `/overlay/leaderboard` with `preview=sample` and the current unsaved appearance query, showing a fictitious top-5

#### Scenario: Chat preview unchanged in kind
- **WHEN** the operator selects Chat
- **THEN** the preview iframe loads `/overlay` with `preview=sample` (or live chat if that existing mode is chosen from preview overflow) and does not embed the leaderboard

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
Audience SHALL offer Commands and Awards lists separate from the viewers people workspace. Each catalog SHALL support create, edit, enable (commands), cooldown (commands), points (awards), splash text, sound, custom image, custom sound file, volume, layout, image fit, image size, and delete. Catalog editors MUST NOT appear in the dock.

#### Scenario: Open commands
- **WHEN** the operator opens Audience Commands
- **THEN** seeded or operator-defined commands are listed and can be edited without leaving `/`

### Requirement: Catalog editors expose templates, media, and layout
Command and award editors SHALL show the available template variables `{viewer}`, `{streamer}`, `{points}`, and `{message}`, insert the chosen variable into the splash field on activation, and show a preview that substitutes sample viewer `Alice`, the current `streamer_display_name` or a localized sample streamer name when empty, sample points, and a short sample message. The image area SHALL preview the effective alert graphic: the source-appropriate built-in emblem when no file is selected and the custom image after upload. Its localized helper text MUST explain that clearing a custom image restores the built-in graphic. Image upload SHALL use `kind` `alert_image` and offer a clear action. Sound SHALL keep the built-in select plus an optional custom file using `kind` `alert_sound`, a Play/Stop preview, and a volume control 0–100. Layout SHALL be a choice of card, banner, or fullscreen. Image fit SHALL be a choice of cover, contain, fill, or tile. Image size SHALL be a slider from 25–300 percent that scales the built-in or custom primary graphic inside the alert frame. File inputs MUST remain keyboard reachable and labeled, MUST expose a visible focus indicator, and dynamic field errors MUST be associated with their controls. Newly uploaded files SHALL be treated as provisional until save; clear, replacement, catalog navigation, normal page unload, and item deletion SHALL request reference-safe cleanup through the overlay-asset delete action. On a stacked narrow layout, pointer selection of a catalog item SHALL reveal the editor while list keyboard navigation SHALL retain focus in the list.

#### Scenario: Insert viewer variable
- **WHEN** the operator activates `{viewer}` in the command editor
- **THEN** `{viewer}` is inserted into the splash template field

#### Scenario: Preview uses streamer name
- **WHEN** `streamer_display_name` is `Jake` and the template contains `{streamer}`
- **THEN** the editor preview contains `Jake`

#### Scenario: Command preview has no custom file
- **WHEN** the operator edits command `gg` without an uploaded image
- **THEN** the image area previews the stable `gg` built-in command signal

#### Scenario: Award preview has no custom file
- **WHEN** the operator edits award `spotter` without an uploaded image
- **THEN** the image area previews the stable Spotter medal

#### Scenario: Clear custom image
- **WHEN** the operator clears a saved or provisional custom image
- **THEN** the image area immediately returns to the effective built-in graphic

#### Scenario: Clear an unsaved upload
- **WHEN** the operator uploads an image and clears it before saving the catalog item
- **THEN** the editor requests deletion of the provisional filename and the server deletes it only when no other record references it

#### Scenario: Select an award on a narrow screen
- **WHEN** the operator uses a pointer to select an award while the catalog columns are stacked
- **THEN** the editor header and fields are brought into the viewport

### Requirement: Audience table headers are a distinct sortable surface
The Audience viewers table header SHALL use a distinct surface or edge from the body while keeping header text contrast. XP and Messages SHALL be sort buttons. The unsorted table SHALL keep the server last-activity order. The first activation of a numeric column SHALL sort that column descending for the selected period; a second activation SHALL sort ascending; a third SHALL restore last-activity order. The active column SHALL expose `aria-sort` (`ascending`, `descending`, or `none`). The selected column and direction SHALL persist in the current browser or WebView and MUST NOT be written to SQLite or `config.json`. An invalid stored preference SHALL fall back to last-activity order. A previously stored Score sort preference SHALL be treated as XP.

#### Scenario: First sort by score
- **WHEN** the operator activates XP while the table is in last-activity order
- **THEN** rows are ordered by the selected period's `xp` descending and XP reports `aria-sort` `descending`

#### Scenario: Cycle back to activity
- **WHEN** XP is already sorted ascending and the operator activates XP again
- **THEN** rows return to last-activity order and XP reports `aria-sort` `none`

#### Scenario: Restore sort preference
- **WHEN** the operator sorted Messages descending, closed the console, and reopens Audience in the same browser or WebView
- **THEN** Messages is again sorted descending for the current period

### Requirement: Audience row activation opens the viewer card
A single pointer activation on an Audience viewer row SHALL open that viewer's card (wide inspector or compact sheet). The display name SHALL be a semantic button that opens the same card. Enter and Space on the focused row or name control SHALL open the same card. The Actions column MUST NOT be present. A decorative chevron MAY remain and MUST be hidden from assistive technology.

#### Scenario: Click row on a wide layout
- **WHEN** the Audience directory is shown at a wide desktop width and the operator activates a viewer row
- **THEN** that viewer is selected and its card loads in the inspector without a separate Actions control

#### Scenario: Keyboard open
- **WHEN** a viewer row or its name control is focused and the operator presses Enter or Space
- **THEN** that viewer's card opens

### Requirement: Audience list shows unique platform icons
The Audience Platforms column SHALL render one compact SVG icon per unique platform id from the list payload. Each icon MUST expose a localized accessible name and tooltip. The column MUST NOT rely on color alone and MUST NOT keep a permanent visible text label beside each icon. When `platforms` is empty, the column SHALL use a localized empty state rather than inventing a platform.

#### Scenario: Merged profile icons
- **WHEN** the list payload for a viewer has `platforms` `["twitch","youtube"]`
- **THEN** the row shows Twitch and YouTube icons, each with an accessible name, and no permanent "Twitch" / "YouTube" text in the cell

#### Scenario: Unknown platform id
- **WHEN** `platforms` includes an unrecognized id
- **THEN** that id still appears as an identifiable icon with the raw id as its accessible name

### Requirement: Audience New stream is separate from filters
The confirmed New stream action in Audience SHALL remain keyboard reachable and MUST NOT sit inside the period/search filter group. It SHALL remain visually distinct from those filters at supported desktop widths. Confirmation and session-reset behavior MUST stay unchanged.

#### Scenario: Audience desktop toolbar
- **WHEN** the Audience viewers view is shown at a supported desktop width
- **THEN** New stream is aligned with the toolbar actions and is not grouped with the period select or search field

### Requirement: Messages offer Reward next to delete
Live Messages and `/dock/messages` SHALL show a Reward control on rows that have a stable `user_id`, in addition to delete when a source `id` exists. Reward SHALL open a picker of award types, not a stack of per-type buttons on the row. The picker MUST be usable in a height-capped dock: header stays put, the list scrolls.

#### Scenario: Reward then delete still available
- **WHEN** a message has both source `id` and `user_id`
- **THEN** both Delete and Reward are available

### Requirement: Active Live data follows leaderboard events
The admin SHALL apply a `leaderboard` WebSocket frame to Live Leaderboard only when its `period` matches the selected period. A hidden Live tab SHALL retain the latest matching snapshot without unnecessary rendering and SHALL render or fetch current data when opened. When Statistics is active, leaderboard changes SHALL trigger a debounced refresh no more than once per second; when hidden, Statistics SHALL refresh on its next open. The existing HTTP reads SHALL remain the initial and reconnect recovery source.

#### Scenario: Matching live period
- **WHEN** Live Leaderboard displays `session` and receives a `session` leaderboard frame
- **THEN** its rows update without the operator pressing Refresh

#### Scenario: Different period
- **WHEN** Live Leaderboard displays `day` and receives a `session` frame
- **THEN** the visible day ranking is not replaced by session rows

#### Scenario: Statistics burst
- **WHEN** Statistics is active and several leaderboard frames arrive within one second
- **THEN** the admin performs at most one debounced statistics refresh in that interval

### Requirement: Reward action reports success in context
After a successful grant, Live and dock SHALL close the picker, restore the Reward control, and announce a localized success containing the award name and positive points. Failure SHALL keep an actionable error and allow retry. The source row MUST remain available unless separately deleted.

#### Scenario: Advice granted
- **WHEN** the operator chooses Advice and the grant request succeeds
- **THEN** the row reports a localized Advice `+points` success through visible feedback and an accessible live region

#### Scenario: Grant fails
- **WHEN** the grant request fails
- **THEN** the picker or row shows an error and the operator can retry without reloading

### Requirement: Settings expose activity instead of points per message
Settings SHALL offer integer fields for `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` with the same validation as config-store. The operator-facing copy SHALL describe a silent per-viewer interval and session cap, not XP per chat line. The previous points-per-message control MUST NOT remain as the progress setting. Live Leaderboard, Statistics, viewer cards, and the dock MUST label the contribution value as XP.

#### Scenario: Open settings
- **WHEN** the operator opens Settings after this change
- **THEN** activity interval, session limit, and activity XP are editable and points per message is not offered as the progress control

#### Scenario: Viewer card
- **WHEN** the operator opens a viewer card
- **THEN** session, day, and all-time contribution values are labeled as XP

### Requirement: Catalog selection is persistent and distinguishable
Commands and Awards lists SHALL show the currently edited item with a persistent selected state distinguishable from hover by more than color alone. The selected row SHALL use appropriate selection semantics and remain selected while its editor is open.

#### Scenario: Select an award
- **WHEN** the operator opens an award from the Audience catalog and moves the pointer away
- **THEN** that award remains visibly and semantically selected

### Requirement: New stream aligns with the Live toolbar
The existing confirmed New stream action SHALL align in the same Live toolbar row as the other hot controls at supported desktop widths without changing its confirmation or reset behavior.

#### Scenario: Live desktop toolbar
- **WHEN** the Live workspace is shown at a supported desktop width
- **THEN** New stream is vertically aligned with the other toolbar actions and remains keyboard reachable

### Requirement: Audience directory shows viewer portraits
Each Audience viewer row SHALL show a compact portrait beside the display name. The image SHALL use the list `avatar_url` when present, with `referrerPolicy` `no-referrer`. When `avatar_url` is missing or the image errors, the row SHALL show a deterministic initials (or equivalent) fallback that does not reserve a blank hole. The portrait MUST be decorative (`alt` empty, `aria-hidden` on the image) so the name button remains the accessible control.

#### Scenario: Cached face in the table
- **WHEN** a list row includes `avatar_url` `/overlay/assets/asset_ab12cd.png`
- **THEN** the Viewer cell shows that image beside the name

#### Scenario: Broken image fallback
- **WHEN** the portrait URL fails to load
- **THEN** the row shows the initials fallback and keeps the name button usable

### Requirement: Viewer card manages custom portrait and ranking visibility
The viewer card SHALL show the resolved portrait, a file control to upload a custom portrait, a control to clear it when one is stored, and a checkbox (or equivalent) to hide the viewer from the leaderboard. Upload SHALL call `POST /api/viewers/avatar/upload`. Clear SHALL call `POST /api/viewers/avatar/clear`. Hide SHALL persist through `POST /api/viewers/update` with `leaderboard_hidden`. Existing display-name and merge controls remain. Upload errors SHALL surface on the card without leaving the inspector.

#### Scenario: Upload from the card
- **WHEN** the operator chooses a PNG on a known viewer and the upload succeeds
- **THEN** the card and table show the new portrait without a full page reload

#### Scenario: Hide from leaderboard
- **WHEN** the operator checks hide-from-leaderboard and the save succeeds
- **THEN** Live and OBS leaderboards omit that viewer while the Audience row remains

### Requirement: Settings can disable custom portraits
Settings SHALL offer a boolean control for `custom_avatars_enabled`, saved through `POST /api/config/update`. When the flag is false, Audience, overlay, alerts, and leaderboard SHALL ignore stored custom files and use cache or last-seen remote URLs. The control MUST be labeled so the operator understands it disables custom portraits, not platform cache.

#### Scenario: Disable custom
- **WHEN** the operator turns custom portraits off and saves
- **THEN** a viewer with both custom and cached files is shown with the cached platform portrait

### Requirement: Studio leaderboard inspector edits title and rank cap
When the selected Studio surface is leaderboard, Essentials SHALL expose sizing as Automatic or Fixed, title as From theme, Custom, or Hidden, and whether message count is shown. Custom title input SHALL appear only when Custom is selected. Fixed font size and `max_entries` (integer 1–20, default 5) SHALL remain reachable in All settings; `max_entries` MUST be labelled as a maximum because source height may show fewer complete rows. All fields SHALL update the existing draft preview and persist only through Publish. Live Messages, dock, and overlay chat SHALL remain unchanged.

#### Scenario: Automatic sizing preview
- **WHEN** the operator selects Automatic and resizes the leaderboard preview
- **THEN** the preview scales the composition from width and changes the number of complete rows from height without publishing

#### Scenario: Custom themed title
- **WHEN** the operator selects Custom, enters `Топ эфира`, and publishes
- **THEN** the preview and live leaderboard use that text in the selected theme's title slot

#### Scenario: Set overlay heading
- **WHEN** the operator selects Custom, types `Топ эфира`, and publishes
- **THEN** the Studio preview and `/overlay/leaderboard` show that text in the same theme-owned title slot

#### Scenario: Hide secondary metric
- **WHEN** the operator leaves message count disabled
- **THEN** the preview shows XP-first rows without message counts

#### Scenario: Maximum rank cap
- **WHEN** max entries is 5 and the preview has room for eight rows
- **THEN** no more than five rows are shown

#### Scenario: Cap at three
- **WHEN** the operator sets max entries to 3 and publishes
- **THEN** the preview and live ranking show at most three complete rows

#### Scenario: Fixed compatibility controls
- **WHEN** the operator selects Fixed in All settings
- **THEN** a labelled 12–48 px field is available with inline validation and is associated with its error text

### Requirement: Settings configure global leaderboard visibility
Settings SHALL expose policy, display duration, cooldown, dirty interval, award trigger, and meaningful rank-change trigger as one global leaderboard behavior section. The UI SHALL explain that the policy applies to every production leaderboard source and is independent from Studio appearance presets. Trigger controls that cannot affect the selected policy MAY be disabled but MUST retain their saved values. Saving SHALL use the existing config update and field-error behavior.

#### Scenario: Choose automatic behavior
- **WHEN** the operator selects Automatic, enables award and rank-change triggers, and saves
- **THEN** public config and runtime policy update without publishing a Studio appearance draft

#### Scenario: Choose on request
- **WHEN** the operator selects On request
- **THEN** the UI explains that dock actions and configured viewer commands may show the board while automatic triggers do not

### Requirement: Message dock provides compact leaderboard controls
`/dock/messages` SHALL retain the message log and add a small pinned operator toolbar above its scrollable message body. The toolbar SHALL show current policy/state and a live countdown for timed state. Under `always`, it SHALL expose one labelled visibility switch whose on state clears the manual hidden override and whose off state hides the board. Under `automatic` and `on_request`, it SHALL expose Show for the configured duration, a pressed-state Pin toggle, and Hide; Show SHALL be disabled while pinned, turning Pin off SHALL Resume policy behavior, and Hide SHALL remain available while pinned. No standalone Auto or Resume control SHALL be shown. The toolbar SHALL also expose the existing active-preset selection using `POST /api/overlay/activate`. It MUST remain unthemed, keyboard usable, localized in English and Russian, and usable at narrow dock widths without covering the last message.

#### Scenario: Timed state in dock
- **WHEN** the board is visible for another 12 seconds
- **THEN** the dock status announces timed visibility and updates an accessible countdown without moving message scroll position

#### Scenario: Toggle pin
- **WHEN** the operator pins the board and later turns the Pin toggle off
- **THEN** the dock sends Pin then Resume, reports progress in context, and follows authoritative responses or WebSocket frames

#### Scenario: Always policy switch
- **WHEN** policy is `always` and the operator turns off the labelled visibility switch
- **THEN** the board remains hidden until the operator turns the same switch on or the process restarts

#### Scenario: Hide stays available while pinned
- **WHEN** the board is pinned under `automatic` or `on_request`
- **THEN** Show is disabled, Pin is announced as pressed, and Hide remains available as the direct hide action

#### Scenario: Failed control
- **WHEN** a dock visibility request fails
- **THEN** controls leave the prior authoritative state visible and offer a localized retry-safe error

#### Scenario: Narrow dock
- **WHEN** the dock is 300 CSS pixels wide
- **THEN** controls wrap or compact without horizontal scrolling and icon-only variants have hover/focus tooltips and accessible names

### Requirement: Command editor supports leaderboard actions
The Audience command editor SHALL let the operator choose Alert or Show leaderboard. Alert SHALL retain all current splash, media, sound, and duration fields. Show leaderboard SHALL keep trigger, enabled, and per-viewer cooldown controls, hide irrelevant alert presentation fields, and explain that the command shows the board for its configured global display duration. No leaderboard command SHALL be created automatically.

#### Scenario: Create leaderboard command
- **WHEN** the operator creates enabled trigger `leaderboard` with action Show leaderboard and a 180-second cooldown
- **THEN** the saved catalog row is distinguishable from alert commands and `!leaderboard` can request the board

#### Scenario: Switch action without losing clarity
- **WHEN** the operator changes an alert command to Show leaderboard
- **THEN** irrelevant fields are no longer required and the visible form describes the new effect before save
