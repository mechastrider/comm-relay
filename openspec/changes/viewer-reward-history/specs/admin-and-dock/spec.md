## ADDED Requirements

### Requirement: Audience includes a global reward-history view
Audience SHALL add a History tab beside Viewers, Commands, and Awards. The tab SHALL show a localized table of award time, viewer, reward name, and points in newest-first order. It SHALL load fresh data when opened and provide explicit Refresh, loading, empty, error with Retry, and Load more states. Load more MUST append older entries without removing already rendered rows. The table MUST be keyboard-readable and MUST expose column headings to assistive technology.

#### Scenario: Open History
- **WHEN** the operator opens the Audience History tab
- **THEN** the newest award entries appear with localized timestamps and signed XP values

#### Scenario: No awards yet
- **WHEN** the history endpoint returns no entries
- **THEN** the tab shows a localized empty state and does not show Load more

#### Scenario: Load fails
- **WHEN** the history request fails
- **THEN** the tab keeps the existing console usable and offers a localized Retry action

#### Scenario: Load more
- **WHEN** the current response has `next_cursor` and the operator activates Load more
- **THEN** older entries are appended and the control reflects its busy state accessibly

### Requirement: Viewer detail includes that viewer's reward history
The existing wide Audience inspector and compact viewer sheet SHALL include a Reward history section scoped to the selected canonical viewer. It SHALL use the same row content, newest-first order, empty/error states, and cursor pagination as global history. Loading or failing to load history MUST NOT hide the viewer's existing profile, statistics, identities, portrait, or merge controls. Changing or closing the selected viewer MUST prevent a late response from rendering under the wrong viewer.

#### Scenario: Open rewarded viewer
- **WHEN** the operator opens a viewer who has received awards
- **THEN** the viewer detail shows only that viewer's newest reward entries

#### Scenario: Viewer has no awards
- **WHEN** the selected viewer has no award history
- **THEN** the rest of the viewer detail remains available and the history section shows a localized empty state

#### Scenario: Selection changes during load
- **WHEN** the operator selects Bob before Alice's history request completes
- **THEN** Alice's late response is discarded or cancelled and MUST NOT appear in Bob's detail

### Requirement: Reward history remains operator-only
The History tab and viewer-detail history SHALL appear only in the admin console. The messages dock and OBS overlay pages MUST NOT gain history controls, history payloads, or a new history WebSocket event.

#### Scenario: Open messages dock
- **WHEN** the operator opens `/dock/messages`
- **THEN** the dock remains a messages-only log without reward history
