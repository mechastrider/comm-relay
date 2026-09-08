## Purpose

Preserve contract-award provenance within the durable interaction-event stream without creating a second reward event kind.

## ADDED Requirements

### Requirement: Contract awards are durable award events
Successful winner settlement SHALL append exactly one interaction event with kind `award`, the snapshotted reward id, reward-name snapshot, points, canonical `viewer_id`, timestamp, and the settling `contract_id`. It MUST NOT persist contract objective text or chat content. Closing without a result MUST NOT append an interaction event.

#### Scenario: Contract winner is recorded
- **WHEN** a viewer wins a 25 XP contract
- **THEN** one `award` interaction event records 25 points, that viewer, the reward snapshot, and the contract id

#### Scenario: Contract closes without result
- **WHEN** the operator closes an active contract without a winner
- **THEN** no command, activity, or award interaction event is added
