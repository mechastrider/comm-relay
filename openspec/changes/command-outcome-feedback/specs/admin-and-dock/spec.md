## ADDED Requirements

### Requirement: Admin and dock show accepted versus frozen command lines
Live Messages and `/dock/messages` SHALL mark a matched command line as accepted when its outcome is `fired`, including `show_leaderboard` with no splash, and as frozen when its outcome is `cooldown`. Frozen rows SHALL show a live countdown of remaining cooldown time. Accepted rows MUST NOT show a countdown. Overlay chat MUST NOT use this countdown. After a page reload, while the same process is still running, admin and dock SHALL restore those statuses from recent messages plus the process-local outcome map. A process restart SHALL clear restored outcomes, matching in-memory cooldown.

#### Scenario: Accepted leaderboard command
- **WHEN** `!leaderboard` fires
- **THEN** admin and dock mark that line accepted without a countdown

#### Scenario: Frozen countdown
- **WHEN** the same viewer sends `!gg` during cooldown
- **THEN** admin and dock mark the second line frozen and tick remaining seconds

#### Scenario: Reload while process lives
- **WHEN** the operator reloads admin or dock before cooldown expires
- **THEN** the frozen line still shows remaining time from the in-memory map

### Requirement: Settings can hide overlay cooldown rows
Settings SHALL offer a boolean control for `hide_command_cooldown_overlay` next to `hide_command_messages`, saved through `POST /api/config/update`. Default SHALL be false (show a short overlay cooldown). Copy SHALL explain that this only hides frozen cooldown rows on `/overlay`, not admin or dock, and is independent of hiding successful command lines.

#### Scenario: Hide overlay cooldown
- **WHEN** the operator enables hide overlay cooldown and saves
- **THEN** `POST /api/config/update` persists `hide_command_cooldown_overlay` true

## MODIFIED Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views, including the hot active-preset control. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide a surface-centric preview and appearance editor, Publish for overlay drafts, and Add to OBS for OBS source URLs including `/overlay/alert` and `/dock/messages`. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, `hide_command_cooldown_overlay`, `streamer_display_name`, activity XP settings, diagnostics, about information, and implemented data-management controls.

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

#### Scenario: Hide overlay command cooldown
- **WHEN** the operator enables hide overlay command cooldown and saves
- **THEN** `POST /api/config/update` persists `hide_command_cooldown_overlay` true

#### Scenario: Save connections
- **WHEN** the operator enables Twitch with a channel and saves
- **THEN** `POST /api/config/update` persists those settings and the Twitch connector picks them up without a process restart

#### Scenario: Save activity settings
- **WHEN** the operator sets activity interval 120, session limit 5, and activity XP 2 and saves
- **THEN** `POST /api/config/update` persists those activity fields and they apply to new counted lines without a process restart

#### Scenario: Save streamer name
- **WHEN** the operator saves streamer display name `Jake` in Settings
- **THEN** `POST /api/config/update` persists `streamer_display_name` `Jake`

### Requirement: Dock is a messages-only live log
`/dock/messages` SHALL show a compact live list, restore up to 100 recent messages, preserve manual scroll position near the threshold, and reconnect on WebSocket drop (backoff 500 ms to 10 s). The dock MUST NOT be required on the program overlay URL. Restored command lines SHALL include accepted or frozen outcome chrome when the process still holds that outcome.

#### Scenario: Dock reload
- **WHEN** the dock page loads with history available
- **THEN** up to 100 recent messages are shown and new `/ws` messages append

#### Scenario: Dock reload restores frozen command
- **WHEN** the dock reloads while a command cooldown is still active in the same process
- **THEN** the matching recent command line shows frozen chrome and remaining time
