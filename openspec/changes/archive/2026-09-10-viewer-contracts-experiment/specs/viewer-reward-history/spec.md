## Purpose

Keep the existing reward journal complete when an operator settles a viewer contract.

## ADDED Requirements

### Requirement: Contract awards appear in existing reward history
A successful contract winner award SHALL appear as one ordinary award entry in global and viewer-scoped reward history using the snapshotted reward name and points. The response MUST NOT expose `contract_id`, contract title, objective, or a new event kind. A no-result close MUST NOT create a history entry.

#### Scenario: Winner history
- **WHEN** Alice wins a contract promising the `Spotter` reward
- **THEN** the Journal and Alice's viewer card show one `Spotter` award with the promised points

#### Scenario: No-result close
- **WHEN** a contract closes without a winner
- **THEN** global and viewer-scoped reward history remain unchanged
