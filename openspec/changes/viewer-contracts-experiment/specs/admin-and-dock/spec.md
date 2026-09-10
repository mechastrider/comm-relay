## Purpose

Add the bounded viewer-contract workflow to the operator console and compact presentation controls to the messages dock.

## ADDED Requirements

### Requirement: Live provides a viewer contracts workspace
Live SHALL include a localized Contracts view. With no active contract it SHALL show labeled title and objective fields, an existing-reward selector that exposes reward name and XP, and an Announce action. With an active contract it SHALL show the snapshotted title, objective, reward, and announcement time plus actions to announce again, award a winner, or close without result. Loading, empty-catalog, validation, conflict, persistence-error, and retry states MUST be explicit and MUST NOT discard entered draft text after a failed open.

#### Scenario: Draft and announce
- **WHEN** the operator enters valid contract text, selects an award, and activates Announce
- **THEN** the active contract replaces the draft only after the server confirms it was persisted

#### Scenario: Reward catalog is empty
- **WHEN** no award types exist
- **THEN** Announce is unavailable and the UI explains that an award must first be created in Audience

#### Scenario: Another client opened a contract
- **WHEN** opening the draft returns HTTP 409
- **THEN** the view reloads current state, preserves the draft locally, and explains the conflict

### Requirement: Winner selection is deliberate and accessible
Award winner SHALL open a labeled searchable canonical-viewer picker using current Audience data and distinguish duplicate display names with platform context. The final award action and close-without-result action MUST each require confirmation naming the contract and consequence. Focus SHALL move into the confirmation surface and return to the invoking control on cancellation. Success SHALL clear the active view; failure SHALL keep it and allow retry.

#### Scenario: Award a duplicate display name
- **WHEN** two viewers share a display name and the operator searches for that name
- **THEN** both options remain distinguishable and the selected canonical `viewer_id` is submitted

#### Scenario: Cancel settlement
- **WHEN** the operator cancels winner or no-result confirmation
- **THEN** the active contract remains unchanged and focus returns to the action that opened confirmation

#### Scenario: Settlement conflict
- **WHEN** settlement returns HTTP 409 because another client already closed the contract
- **THEN** the UI reloads the current state and does not claim that a second reward was granted

### Requirement: The messages dock controls active contract presentation
While a contract is active, the OBS messages dock SHALL replace ordinary leaderboard visibility actions with icon-only controls that switch the existing leaderboard Browser Source between the contract objective and ranking, repeat the brief alert announcement, and hide or show the shared surface. Every control MUST have a localized accessible name, hover/focus tooltip, busy state, and pressed state where applicable. The dock MUST NOT add contract drafting, winner-selection, editing, or close controls, and contract alert frames MUST NOT become chat rows.

#### Scenario: Contract becomes active while dock is open
- **WHEN** the dock receives the authoritative active-contract presentation state
- **THEN** it shows the contract presentation controls without adding a chat row

#### Scenario: Operator switches to ranking
- **WHEN** the operator activates the ranking icon while a contract is active
- **THEN** the shared Browser Source shows the current leaderboard and the ranking control exposes its pressed state

#### Scenario: Contract ends
- **WHEN** the active contract is awarded or closed without result
- **THEN** contract controls disappear and ordinary leaderboard controls and visibility policy resume unchanged
