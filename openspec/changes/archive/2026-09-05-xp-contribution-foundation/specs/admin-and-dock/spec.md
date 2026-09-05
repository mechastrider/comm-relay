## Purpose

Show XP instead of Score in Audience, Live, and Settings, and let the operator configure silent activity grants.

## MODIFIED Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views, including the hot active-preset control. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide a surface-centric preview and appearance editor, Publish for overlay drafts, and Add to OBS for OBS source URLs including `/overlay/alert` and `/dock/messages`. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, activity XP settings, diagnostics, about information, and implemented data-management controls.

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

## ADDED Requirements

### Requirement: Settings expose activity instead of points per message
Settings SHALL offer integer fields for `activity_interval_seconds`, `activity_session_limit`, and `activity_xp` with the same validation as config-store. The operator-facing copy SHALL describe a silent per-viewer interval and session cap, not XP per chat line. The previous points-per-message control MUST NOT remain as the progress setting. Live Leaderboard, Statistics, viewer cards, and the dock MUST label the contribution value as XP.

#### Scenario: Open settings
- **WHEN** the operator opens Settings after this change
- **THEN** activity interval, session limit, and activity XP are editable and points per message is not offered as the progress control

#### Scenario: Viewer card
- **WHEN** the operator opens a viewer card
- **THEN** session, day, and all-time contribution values are labeled as XP
