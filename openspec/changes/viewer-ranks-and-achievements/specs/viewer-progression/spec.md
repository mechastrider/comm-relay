## Purpose

Define local, platform-neutral viewer titles and achievements derived from durable participation facts.

## ADDED Requirements

### Requirement: Viewer level is derived from all-time XP
The system SHALL maintain an operator-editable level catalog whose rows contain a stable id, localized title, unique non-negative `min_xp`, and `announce` flag. Exactly one baseline level with `min_xp` 0 MUST exist and MUST NOT be deletable. A viewer's current level SHALL be the row with the greatest `min_xp` not exceeding all-time XP; level calculation MUST NOT consume or grant XP.

#### Scenario: Viewer crosses a threshold
- **WHEN** an award raises a viewer from 490 to 515 all-time XP and a level starts at 500
- **THEN** the viewer's current title changes to that level
- **AND** no additional XP is granted by the level change

#### Scenario: Baseline is protected
- **WHEN** the operator attempts to delete the level whose `min_xp` is 0
- **THEN** the request fails with a field-safe validation error and the catalog is unchanged

### Requirement: Achievement rules use bounded durable metrics
Each achievement SHALL have a stable id, localized name and description, `enabled`, `secret`, `announce`, and repeat mode. Its active rule revision SHALL select exactly one metric from all-time messages, all-time XP, count of one award id, successful count of one command id, stream participation count, or contract-win count, plus a positive target. Award and command subjects MUST reference a currently existing catalog item when saved. Achievements MUST NOT grant XP or recursively contribute to any metric.

#### Scenario: Award-specific progress
- **WHEN** an enabled achievement targets 10 grants of award `spotter` and a viewer receives the tenth successful grant
- **THEN** the achievement unlocks once from the committed award history
- **AND** the unlock does not change XP

#### Scenario: Failed command does not count
- **WHEN** a recognized command is rejected by its cooldown or does not complete successfully
- **THEN** its successful-command achievement metric does not increase

#### Scenario: Deleted subject remains understandable
- **WHEN** an award referenced by an existing achievement is later deleted
- **THEN** the achievement retains its snapshotted subject label, stops gaining progress, and remains editable

### Requirement: Achievements support one-time and repeatable unlocks
A one-time achievement SHALL unlock at most once per canonical viewer and rule revision. A repeatable achievement with target `N` SHALL unlock occurrences at `N`, `2N`, `3N`, and subsequent integer multiples, while preserving every occurrence. One committed cause MAY unlock multiple achievements and a level together.

#### Scenario: Repeatable threshold
- **WHEN** a repeatable 5-message achievement observes the viewer's tenth all-time message
- **THEN** occurrence 2 unlocks and occurrence 1 remains in history

#### Scenario: Large atomic increase crosses multiple occurrences
- **WHEN** a repeatable XP achievement advances atomically from below one threshold to beyond three thresholds
- **THEN** every newly crossed occurrence is persisted exactly once

### Requirement: Rule changes create explicit revisions
Changing an achievement metric, subject, target, or repeat mode SHALL create a new monotonically increasing rule revision. Editing its name, description, enabled, secret, or announce fields MUST NOT create a revision. Previous unlocks SHALL retain their revision and snapshots. Reconciliation against a new revision MUST be idempotent and silent.

#### Scenario: Lower a target
- **WHEN** the operator changes a one-time message target from 100 to 50 for a viewer already at 75
- **THEN** a new rule revision is saved and a backfilled unlock is recorded for that revision
- **AND** no production alert is emitted

#### Scenario: Rename only
- **WHEN** the operator changes only an achievement name
- **THEN** the active revision number and unlock set remain unchanged

### Requirement: Runtime evaluation is committed and idempotent
The system SHALL evaluate affected enabled rules after durable facts from messages, XP grants, successful commands, stream participation, and contract wins are committed. Unlocks MUST be unique for viewer, achievement revision, and occurrence. A failed transaction, replayed event, restart, or repeated reconciliation MUST NOT create duplicate unlocks or alerts.

#### Scenario: Persist before announce
- **WHEN** one award causes a level-up and two achievement unlocks
- **THEN** all resulting state is committed before one production progression event is published

#### Scenario: Retry after commit
- **WHEN** the same causal operation is evaluated again after its unlock rows already exist
- **THEN** no duplicate unlock rows or production alert are produced

### Requirement: Administrative reconciliation is silent
Startup, upgrade backfill, catalog edits, achievement revision changes, viewer merge, and explicit data reconciliation SHALL calculate current levels, progress, and missing unlock history without publishing production progression alerts. Such unlock records SHALL be marked as backfilled. Only newly committed live viewer activity MAY produce progression alerts.

#### Scenario: Upgrade existing history
- **WHEN** an existing installation first starts with historical messages and awards
- **THEN** eligible achievement unlocks are created as backfilled and current levels resolve from existing all-time XP
- **AND** `/overlay/alert` receives no historical notification burst

### Requirement: Progression alert eligibility is independently controlled
A live level crossing SHALL be announceable only when the level, global level alerts, and viewer progression alerts are enabled. A live achievement unlock SHALL be announceable only when the achievement, its `announce` flag, global achievement alerts, and viewer progression alerts are enabled. Secret achievements MAY announce only after unlock. Suppression MUST NOT prevent state, history, or progress updates.

#### Scenario: Viewer alert exclusion
- **WHEN** a viewer with `progression_alerts_disabled` true unlocks an announced achievement
- **THEN** the unlock is stored and visible in the viewer card but no production progression event is emitted

#### Scenario: Secret locked achievement
- **WHEN** an operator opens a viewer who has progress toward a locked secret achievement
- **THEN** the viewer response does not reveal its name, description, subject, target, or numeric progress

### Requirement: Starter progression catalog is locale-aware and user-owned
On first progression initialization, every fresh and upgraded database SHALL receive ordinary editable levels `recruit` (0), `regular` (100), `veteran` (500), `elite` (1500), and `legend` (5000), plus starter achievements First Contact (1 message), Intel Officer (5 `intel` awards), Spotter (10 `spotter` awards), Comedian (10 `joke` awards), Meme Lord (10 `meme` awards), Veteran (10 participating streams), Clutch (1 `clutch` award), and Contractor (1 contract win). Starter achievements SHALL be enabled, non-secret, announced, and one-time; starter levels SHALL be announced. Global achievement and level alerts SHALL default disabled so upgrades cannot create an unsolicited on-stream behavior change. Display text SHALL use the persisted initialization locale. Stable ids and thresholds SHALL match across locales. Deleted or edited seeds MUST NOT be restored, translated, or reset later.

#### Scenario: Upgrade creates the catalog once
- **WHEN** an existing database without progression bootstrap metadata opens under `ru-RU`
- **THEN** the Russian starter catalog is inserted once and historical facts are reconciled silently

#### Scenario: Locale changes later
- **WHEN** the operator changes interface locale after progression initialization
- **THEN** user-owned catalog text remains unchanged

#### Scenario: First live threshold before opt-in
- **WHEN** a newly initialized installation has not enabled progression alerts and a viewer crosses a live starter threshold
- **THEN** progression state and history update but no production progression frame is emitted

### Requirement: Viewer merges preserve complete progression history
Merging canonical viewers SHALL consolidate every historical session and day stat row, interaction fact, achievement unlock, and progression-alert exclusion into the target before hiding the source. Counters sharing the same period SHALL be summed, unlock collisions SHALL keep one occurrence without losing the earliest unlock time, and the exclusion flags SHALL combine restrictively. Merge reconciliation MUST be atomic and silent.

#### Scenario: Viewers participated in different old sessions
- **WHEN** two viewers with stats in different completed sessions are merged
- **THEN** the target's participation count includes both sessions and all historical rows remain attributable to the target

#### Scenario: Duplicate achievement occurrence
- **WHEN** both viewers already hold occurrence 1 of the same achievement revision
- **THEN** the target retains one occurrence with the earlier unlock time and no alert is emitted
