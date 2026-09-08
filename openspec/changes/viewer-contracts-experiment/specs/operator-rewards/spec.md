## Purpose

Allow contract settlement to reuse the normal award outcome while honoring terms promised when the contract was announced.

## ADDED Requirements

### Requirement: Contract settlement grants a catalog reward snapshot
A successful viewer-contract award SHALL apply its snapshotted catalog reward as one normal operator award: positive XP SHALL be added once, the captured reward id and name SHALL identify the award event, and the captured presentation SHALL drive the award alert. It MUST NOT require the live catalog row still to exist and MUST NOT add a second reward or currency system.

#### Scenario: Deleted catalog item is awarded
- **WHEN** an active contract's source reward was deleted after announcement and the operator selects a winner
- **THEN** settlement grants the snapshotted points once and emits a normal award alert using the captured presentation

#### Scenario: Contract award reaches existing consumers
- **WHEN** winner settlement commits
- **THEN** XP, leaderboard publication, interaction events, and alert behavior match a manual grant of the promised reward
