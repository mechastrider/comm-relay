## MODIFIED Requirements

### Requirement: Admin console manages connections, OBS setup, and appearance
The admin page at `/` SHALL provide connection forms for Twitch, YouTube, VK, and network proxy; OBS setup URLs for chat overlay, leaderboard, and dock; overlay appearance including presets; interface language, message sound, `points_per_message`, and `day_reset_hour`; a Monitor versus Viewers main canvas; a New stream control; viewer search, cards, and merge; diagnostics; and an about dialog.

#### Scenario: Copy overlay URL
- **WHEN** the operator opens OBS setup
- **THEN** the UI shows the overlay, leaderboard, and dock URLs for the current listen address and can copy them

#### Scenario: Save connections
- **WHEN** the operator enables Twitch with a channel and saves
- **THEN** `POST /api/config/update` persists those settings and the Twitch connector picks them up without a process restart

## ADDED Requirements

### Requirement: Main canvas switches between live messages and viewers
The admin console SHALL keep live messages on a Monitor view and SHALL provide a Viewers view on the same main canvas (not only a settings dialog): searchable list, selected-viewer card with identities and period counters, and merge. Switching views MUST NOT require leaving `/`. The messages dock at `/dock/messages` SHALL stay a messages-only log.

#### Scenario: Open viewers
- **WHEN** the operator selects Viewers
- **THEN** the main canvas shows the viewer list and can open a card without opening Connections or OBS dialogs

#### Scenario: Merge from the card
- **WHEN** the operator confirms merge of the selected viewer into another listed viewer
- **THEN** the client calls `POST /api/viewers/merge` and the list shows a single remaining canonical viewer

### Requirement: New stream requires confirmation
The admin chrome SHALL offer a New stream action. The system MUST NOT start a new session until the operator confirms. After success, session counters on the Viewers view and session leaderboard SHALL reset while day and all-time counters remain.

#### Scenario: Accidental click
- **WHEN** the operator activates New stream and dismisses the confirmation
- **THEN** the current session stays open and session counters are unchanged

#### Scenario: Confirmed new stream
- **WHEN** the operator confirms New stream
- **THEN** the client calls `POST /api/sessions/start` and session totals on the Viewers view are empty
