## Purpose

Add Studio controls for running globally shared test scenarios and opening dedicated fail-closed test surfaces in OBS.

## ADDED Requirements

### Requirement: Studio provides an explicit interactive test mode

Studio SHALL let the operator enter a test mode for the selected chat, leaderboard, or alerts surface without replacing the existing static sample-preview workflow. Test mode MUST expose compatible scenarios, editable bounded sample content where applicable, a visibly labelled Run action, Reset, Replay, receiver feedback, and copyable test-only OBS URLs. Studio MUST explain that every connected test surface shares one global channel, so an action from another Studio tab may reset or replace the current run.

#### Scenario: Enter test mode
- **WHEN** the operator opens test mode for the selected surface
- **THEN** its preview opens the selected dedicated test page and subscribes only to the global debug channel
- **AND** Studio presents only scenarios compatible with that surface

#### Scenario: Return to appearance preview
- **WHEN** the operator exits test mode
- **THEN** Studio restores the static sample preview without publishing settings or modifying live sources

### Requirement: Studio communicates debug delivery state

Studio MUST show whether a scenario request is running, succeeded, failed, or reached zero connected debug clients. Reset MUST remain available while delayed scenario steps are pending. A zero-client result is successful and indicates that no delayed step was scheduled.

#### Scenario: Test OBS source is connected
- **WHEN** a scenario is delivered to the Studio preview and a copied OBS test source
- **THEN** Studio reports the successful run and its receiver count

#### Scenario: Debug request fails
- **WHEN** the local debug action returns an error
- **THEN** Studio retains the configured scenario inputs
- **AND** offers an in-context retry

### Requirement: Studio offers stable and current-preview test URLs

Studio MUST offer a stable test-only URL for each surface at `/overlay/test/chat`, `/overlay/test/leaderboard`, or `/overlay/test/alert`. The stable URL MUST follow the active preset so it can remain configured in OBS across restarts and later active-preset changes. Studio MAY also offer a secondary current-preview snapshot URL on the same dedicated path containing the current unpublished draft appearance overrides. Snapshot URLs MUST omit preview, sample, and background-only flags, and Studio MUST explain that later draft appearance edits require recopying the snapshot URL. Both URL kinds MUST be labelled test-only and MUST never display live events. Existing default, live, and pinned production URL copy actions and the active preset MUST remain unchanged.

#### Scenario: Copy a test alert URL
- **WHEN** the operator copies the alert URL from test mode
- **THEN** the URL uses `/overlay/test/alert` and opens an alert surface subscribed only to the global debug channel
- **AND** Studio warns through persistent nearby copy that the URL does not display live events

#### Scenario: Copy the unpublished preview appearance
- **WHEN** the operator copies the current-preview snapshot URL and then edits the draft appearance again
- **THEN** the copied URL retains its prior safe appearance overrides until recopied
- **AND** the stable test URL continues to follow the active preset
