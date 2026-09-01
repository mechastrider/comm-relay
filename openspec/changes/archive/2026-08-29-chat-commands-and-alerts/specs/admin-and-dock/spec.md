## MODIFIED Requirements

### Requirement: Admin console manages live operation, audience, OBS setup, and settings
The admin page at `/` SHALL provide persistent workspaces named Live, Audience, Studio, and Settings. Live SHALL contain current operational status and switchable Messages, Leaderboard, and current Statistics views. Audience SHALL provide the implemented viewer search, detail, merge, leaderboard, and stream-session workflows, plus command and award catalogs. Studio SHALL provide OBS source URLs including `/overlay/alert`, surface presets, preview, and appearance editing. Settings SHALL provide Twitch, YouTube, VK, network proxy, interface language, message sound, `hide_command_messages`, diagnostics, about information, and implemented data-management controls.

#### Scenario: Copy alert URL
- **WHEN** the operator opens Studio source setup and selects Alerts
- **THEN** the UI shows a copyable `/overlay/alert` URL for the current listen address and the source is not a disabled placeholder

#### Scenario: Hide command messages
- **WHEN** the operator enables hide command messages and saves
- **THEN** `POST /api/config/update` persists `hide_command_messages` true

## ADDED Requirements

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
