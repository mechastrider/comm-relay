## Purpose

Attribute live achievement unlocks to the session that caused them while keeping administrative reconciliation sessionless.

## ADDED Requirements

### Requirement: Live achievement unlocks carry authoritative session attribution
Every non-backfilled achievement occurrence created by a live viewer fact SHALL store the open `session_id` atomically with the fact and unlock. Administrative reconciliation, startup/upgrade backfill, catalog edits, rule revisions, and merge reconciliation MUST create or preserve sessionless backfilled unlocks unless an existing live unlock already has authoritative attribution.

#### Scenario: Live threshold crossing
- **WHEN** an award in the open session causes an achievement occurrence
- **THEN** the fact, XP, unlock, and that session id commit atomically

#### Scenario: Rule-edit backfill
- **WHEN** lowering a target creates a backfilled unlock during an open session
- **THEN** that unlock remains marked backfilled with no session attribution

### Requirement: Upgrade attribution is conservative
An upgrade MAY backfill `session_id` for an existing non-backfilled unlock only when its timestamp falls into exactly one stored session interval. It MUST NOT attribute backfilled unlocks or guess across ambiguous or missing boundaries.

#### Scenario: Unambiguous legacy live unlock
- **WHEN** a non-backfilled unlock timestamp belongs to exactly one historical session
- **THEN** the migration links it to that session without changing its snapshot or occurrence

#### Scenario: Existing backfill timestamp
- **WHEN** a backfilled unlock timestamp happens to fall inside a session interval
- **THEN** it remains sessionless

### Requirement: Viewer merges preserve unlock sessions
Merging viewers SHALL preserve the `session_id` of every attributed unlock while applying existing occurrence-collision rules. A collision MUST retain the session attribution belonging to the earliest retained unlock and MUST NOT substitute the merge-time session.

#### Scenario: Duplicate occurrence from different sessions
- **WHEN** both viewers hold the same occurrence and the earlier unlock belongs to an older session
- **THEN** the surviving occurrence retains the older unlock time and that older session id
