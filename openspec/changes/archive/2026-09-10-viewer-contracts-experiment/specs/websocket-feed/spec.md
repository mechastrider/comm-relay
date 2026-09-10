## Purpose

Define backward-compatible contract announcement and persistent presentation state on the production WebSocket feed.

## ADDED Requirements

### Requirement: Contract announcements use an alert envelope
Opening or explicitly repeating an active contract SHALL broadcast one production `/ws` frame with `type` `alert`, `source` `contract`, `contract_id`, `contract_title`, `contract_objective`, `award_id`, `award_name`, positive `points`, RFC3339 `created_at`, and the snapshotted alert presentation fields. Existing clients that do not recognize `source` `contract` MUST continue processing chat, award, command, leaderboard, and settings frames. New connections MUST NOT replay an active or historical contract announcement automatically.

#### Scenario: Open announcement
- **WHEN** a contract is successfully opened
- **THEN** connected production clients receive one contract alert containing the promised task and reward

#### Scenario: Overlay reconnects
- **WHEN** the alert Browser Source reconnects while a contract is active
- **THEN** no announcement is replayed until the operator explicitly announces it again

#### Scenario: Unrelated client
- **WHEN** chat overlay, leaderboard, admin message log, or dock receives a contract alert
- **THEN** its existing message and ranking behavior remains functional

### Requirement: Active contract presentation has an authoritative snapshot
The production `/ws` feed SHALL use a `viewer_contract_state` frame containing `contract` (the public active contract object or null), `content` (`contract` or `leaderboard`), and `visible`. A newly connected client MUST receive the current state. Opening, display changes, award, and no-result close MUST broadcast the updated state only after the authoritative operation succeeds. Clients that do not recognize this frame MUST continue processing known frames.

#### Scenario: Leaderboard connects during an active contract
- **WHEN** the leaderboard Browser Source connects or reconnects while a contract is active
- **THEN** it receives the active contract and current presentation state without replaying the alert announcement

#### Scenario: Contract settles
- **WHEN** award or no-result close commits
- **THEN** connected clients receive `contract=null` and resume ordinary leaderboard behavior
