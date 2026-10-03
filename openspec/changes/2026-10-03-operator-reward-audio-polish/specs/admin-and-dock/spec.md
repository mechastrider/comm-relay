## MODIFIED Requirements

### Requirement: Live provides a viewer contracts workspace
Live SHALL include a localized Viewer rewards view. With no active contract it SHALL show labeled title and objective fields, an existing-reward selector that exposes reward name and XP, and an Announce action. With an active contract it SHALL show the snapshotted title, objective, reward, and announcement time plus actions to announce again, award a winner, or close without result. Loading, empty-catalog, validation, conflict, persistence-error, and retry states MUST be explicit and MUST NOT discard entered draft text after a failed open.

#### Scenario: Draft and announce
- **WHEN** the operator enters valid contract text, selects an award, and activates Announce
- **THEN** the active contract replaces the draft only after the server confirms it was persisted

#### Scenario: Reward catalog is empty
- **WHEN** no award types exist
- **THEN** Announce is unavailable and the UI explains that an award must first be created in Audience

#### Scenario: Another client opened a contract
- **WHEN** opening the draft returns HTTP 409
- **THEN** the view reloads current state, preserves the draft locally, and explains the conflict

### Requirement: The messages dock controls active contract presentation
The OBS messages dock SHALL present the ordinary Show for N seconds, Pin/Resume, and Hide actions as icon-only buttons with localized accessible names and hover/focus tooltips, while retaining the always-policy switch. While a contract is active, the dock SHALL place those visibility actions, a visually separate two-value icon switcher for Viewer reward objective or Leaderboard content, and an icon-only Repeat announcement action in one non-wrapping horizontal row. Show for N seconds, Pin, Resume, Hide, automatic visibility changes, and timed expiry SHALL affect only the shared surface visibility and MUST preserve the selected content. The mode switcher SHALL affect only content and MUST preserve the current visibility state. Every contract control MUST have a localized accessible name, hover/focus tooltip, busy state, and pressed state where applicable. The dock MUST NOT add a second visibility control, contract drafting, winner-selection, editing, or close controls, and contract alert frames MUST NOT become chat rows.

#### Scenario: Contract becomes active while dock is open
- **WHEN** the dock receives the authoritative active-contract presentation state
- **THEN** it shows the contract presentation controls without adding a chat row

#### Scenario: Operator switches to ranking
- **WHEN** the operator activates the ranking icon while a contract is active
- **THEN** the shared Browser Source selects the current leaderboard without changing visibility and the ranking control exposes its pressed state

#### Scenario: Operator controls the selected surface
- **WHEN** the operator uses Show for N seconds, Pin, or Hide while either content mode is selected
- **THEN** the existing visibility behavior applies to that selected content and the content mode does not change

#### Scenario: Contract ends
- **WHEN** the active contract is awarded or closed without result
- **THEN** contract controls disappear and ordinary leaderboard controls and visibility policy resume unchanged

## ADDED Requirements

### Requirement: Viewer reward terminology
The Live contract workflow SHALL be labelled “Зрительские награды” in Russian and “Viewer rewards” in English. Related status, error, confirmation, and progression labels MUST use reward terminology consistently. Existing API paths, identifiers, reward history, and settlement behavior MUST remain compatible.

#### Scenario: Open the reward workspace
- **WHEN** the operator opens Live in either supported locale
- **THEN** the former Contracts tab and its messages use viewer reward terminology
- **AND** announcing, awarding, repeating, and closing a reward retain their existing behavior

### Requirement: Command audio monitoring in the application
The admin SHALL expose a labelled, keyboard-accessible setting for playing command sounds in the app, default enabled and independent of message notifications. While enabled, live command alert events SHALL play their existing custom sound file or built-in tone at the event's volume, throughout admin navigation and without an OBS overlay being open. Safe custom files MUST take precedence over built-in tones; silence and zero volume MUST remain silent. Award, greeting, progression, and contract alerts MUST NOT acquire audible app playback from this setting. No speech synthesis SHALL be added.

#### Scenario: Command voice clip
- **WHEN** a live command alert with a stored sound file arrives while app command audio is enabled
- **THEN** the app plays that clip at its configured volume
- **AND** the same command remains independently audible in the alert overlay

#### Scenario: Disable monitoring
- **WHEN** the operator saves the setting as disabled
- **THEN** active app command audio and pending playback stop
- **AND** overlay audio and message notification settings are unaffected

#### Scenario: Playback recovery
- **WHEN** autoplay is blocked or an audio asset cannot play
- **THEN** admin navigation and live event processing remain usable
- **AND** blocked autoplay has a visible, keyboard-accessible recovery action
- **AND** recovery does not replay stale commands

#### Scenario: Burst and lifecycle
- **WHEN** multiple alerts arrive, the connection reconnects, or the app closes
- **THEN** playback uses a bounded queue with the existing alert scheduling policy, avoids overlapping command clips, never restores historical sounds, and releases timers and audio resources on shutdown
