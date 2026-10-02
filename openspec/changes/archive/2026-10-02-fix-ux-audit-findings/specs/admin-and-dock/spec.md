## ADDED Requirements

### Requirement: Contextual settings save feedback
Settings SHALL localize transport failure recovery and associate save feedback with the originating section.

#### Scenario: Offline save and recovery
- **WHEN** a save fails because transport is unavailable
- **THEN** the draft remains and the operator sees localized guidance to check the running application and retry
- **AND** API field validation remains associated with its controls

#### Scenario: Section navigation after saving
- **WHEN** the operator navigates to a different settings section after a save
- **THEN** that section does not show the other section's confirmation

### Requirement: Empty chat guides first platform setup
An empty Live chat SHALL offer platform setup only when configuration is loaded, all connectors are disabled and the message resource has neither an active load nor error.

#### Scenario: Disabled initial configuration
- **WHEN** the empty chat has all platform connectors disabled
- **THEN** the operator can navigate directly to Platforms with a localized setup link

#### Scenario: Connected waiting state
- **WHEN** at least one platform connector is enabled
- **THEN** an empty chat retains its normal waiting message without a setup prompt

### Requirement: Viewer directory bounds rendered rows
The viewer directory SHALL show at most 50 data rows per page, retain global sorting and search across the fetched result, and expose localized range and previous/next controls.

#### Scenario: Search and paging with a large audience
- **WHEN** the result contains more than 50 viewers
- **THEN** the operator can reach every viewer through pages while no page mounts more than 50 rows
- **AND** search, sort and period changes return to page one, and shrinking results cannot leave an invalid empty page

#### Scenario: Inspector interaction
- **WHEN** the operator uses paging with a viewer inspector open
- **THEN** dirty edits remain guarded and closing the inspector can restore focus to its originating row

### Requirement: Achievement subjects use catalog labels
Achievement editing SHALL offer awards by name and commands by trigger while preserving their existing identifiers in API payloads.

#### Scenario: Named selection
- **WHEN** the operator edits an award-count or command-count rule
- **THEN** the subject is selected from the corresponding catalog and the condition uses its readable label

#### Scenario: Missing subject or failed catalog load
- **WHEN** a stored subject no longer exists or its catalog cannot load
- **THEN** its ID is retained with an explicit unavailable/loading explanation rather than silently replaced
- **AND** catalog failure offers retry

### Requirement: Audited Russian copy matches navigation
Russian diagnostics and hints SHALL use translated headings and actual localized navigation labels and explain activity eligibility without unexplained English jargon.

#### Scenario: Russian settings copy
- **WHEN** the operator reads diagnostics, proxy or activity settings in Russian
- **THEN** no raw runtime translation key, English Network tab name or unexplained eligible term appears
