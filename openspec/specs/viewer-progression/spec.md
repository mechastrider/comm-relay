# viewer-progression Specification

## Purpose
Define local, platform-neutral viewer titles and achievements derived from durable participation facts.

## Requirements

### Requirement: Viewer level is derived from all-time XP
The system SHALL maintain an operator-editable level catalog whose rows contain a stable id, localized title, unique non-negative `min_xp`, and `announce` flag. Exactly one baseline level with `min_xp` 0 MUST exist and MUST NOT be deletable. A viewer's current level SHALL be the row with the greatest `min_xp` not exceeding all-time XP; level calculation MUST NOT consume or grant XP.

#### Scenario: Viewer crosses a threshold
- **WHEN** an award raises a viewer from 490 to 515 all-time XP and a level starts at 500
- **THEN** the viewer's current title changes to that level
- **AND** no additional XP is granted by the level change

#### Scenario: Baseline is protected
- **WHEN** the operator attempts to delete the level whose `min_xp` is 0
- **THEN** the request fails with a field-safe validation error and the catalog is unchanged

### Requirement: Levels persist like and buff session quotas
Each level row SHALL include integers `like_quota` and `buff_quota` in 0 through 100. Starter levels SHALL receive defaults recruit 1, regular 2, veteran 3, elite 4, and legend 5000-XP title 5 for both quotas when first inserted. Operator edits MUST persist. A viewer's current quotas SHALL be those of the level derived from all-time XP at the moment of the social action. Changing a level's quotas MUST NOT rewrite already consumed uses in the open session; remaining uses SHALL be `max(0, new_quota - uses_already_committed_this_session)`.

#### Scenario: Veteran likes
- **WHEN** a viewer at veteran with `like_quota` 3 has not liked this session and sends a valid `!like`
- **THEN** the like may fire and remaining like uses become 2

#### Scenario: Operator lowers quota mid-session
- **WHEN** Alice has already used 2 likes and the operator sets her level `like_quota` to 1
- **THEN** further likes reject with reason `quota` until a new stream session

### Requirement: Starter social achievements
On first social-catalog initialization, the system SHALL insert three deletable one-time announced non-secret achievements when those ids are absent: `cheerleader` (Болельщик / Cheerleader) targeting 10 successful fires of the like command id; `chat_favorite` (Любимец чата / Chat Favorite) targeting 10 grants of award `viewer_like`; `copilot` (Второй пилот / Copilot) targeting 10 successful fires of the buff command id. If the subject command or award is missing at insert time, that achievement SHALL still be created and SHALL gain progress only after the subject exists. Global achievement alerts remain independently gated. Deleted or edited seeds MUST NOT be restored later.

#### Scenario: Cheerleader unlocks from giving likes
- **WHEN** Alice's tenth successful `!like` commits
- **THEN** `cheerleader` unlocks from the successful-command metric
- **AND** the unlock does not grant XP

#### Scenario: Chat Favorite unlocks from received likes
- **WHEN** Bob receives the tenth `viewer_like` grant
- **THEN** `chat_favorite` unlocks from the award-count metric

#### Scenario: Rejected like does not count
- **WHEN** Alice's like is rejected for quota or ambiguous nick
- **THEN** Cheerleader progress does not increase

### Requirement: Starter on-point achievement
On first on-point catalog initialization of a database that does not already contain achievement id `achievement_on_point`, the system SHALL insert a deletable one-time announced non-secret achievement `achievement_on_point` named `Синхрон` for `ru-RU` and `In Sync` for `en-GB`, targeting 10 grants of award `on_point`. Descriptions SHALL be `Получите десять наград «В точку».` and `Receive ten On Point awards.` If award `on_point` is missing at insert time, the achievement SHALL still be created and SHALL gain progress only after that award exists. Global achievement alerts remain independently gated. Deleted or edited seeds MUST NOT be restored later.

#### Scenario: Fresh Russian database
- **WHEN** on-point catalog initialization runs while `admin.time_locale` is `ru-RU` and `achievement_on_point` is absent
- **THEN** achievement `achievement_on_point` exists, is named `Синхрон`, targets 10 `on_point` grants, and is deletable

#### Scenario: Fresh English database
- **WHEN** on-point catalog initialization runs while `admin.time_locale` is `en-GB` and `achievement_on_point` is absent
- **THEN** achievement `achievement_on_point` exists, is named `In Sync`, and targets 10 `on_point` grants

#### Scenario: Tenth On Point unlocks Sync
- **WHEN** an enabled `achievement_on_point` is present and a viewer receives the tenth successful `on_point` grant
- **THEN** the achievement unlocks once from the committed award history
- **AND** the unlock does not grant XP

#### Scenario: Existing achievement kept
- **WHEN** an upgraded database already has achievement id `achievement_on_point`
- **THEN** its name, description, and target are unchanged

#### Scenario: Deleted achievement stays gone
- **WHEN** the operator deletes `achievement_on_point` after initialization
- **THEN** a process restart MUST NOT recreate it

### Requirement: Achievement rules use bounded durable metrics
Each achievement SHALL have a stable id, localized name and description, `enabled`, `secret`, `announce`, and repeat mode. Its active rule revision SHALL select exactly one metric from all-time messages, all-time XP, count of one award id, successful count of one command id, stream participation count, or contract-win count, plus a positive target. Award and command subjects MUST reference a currently existing catalog item when saved. Achievements MUST NOT grant XP or recursively contribute to any metric. Successful like and buff fires SHALL count toward the command-id metric. Rejected and cooldown social matches MUST NOT. Received `viewer_like` grants SHALL count toward the award-id metric. Buff XP MUST NOT count as an extra grant of the original operator award id.

#### Scenario: Award-specific progress
- **WHEN** an enabled achievement targets 10 grants of award `spotter` and a viewer receives the tenth successful grant
- **THEN** the achievement unlocks once from the committed award history
- **AND** the unlock does not change XP

#### Scenario: Failed command does not count
- **WHEN** a recognized command is rejected by its cooldown or does not complete successfully
- **THEN** its successful-command achievement metric does not increase

#### Scenario: Command rename preserves progress identity
- **WHEN** a successful command event is recorded and the operator later changes that command's trigger
- **THEN** the event retains the stable command id selected at execution time
- **AND** an achievement targeting that command id continues to count it

#### Scenario: Unresolvable legacy command remains non-qualifying
- **WHEN** an upgraded historical command event has no stored command id and its saved trigger no longer resolves to a current command
- **THEN** the event remains in durable history
- **AND** it does not increase any id-based command achievement metric

#### Scenario: Deleted subject remains understandable
- **WHEN** an award referenced by an existing achievement is later deleted
- **THEN** the achievement retains its snapshotted subject label, stops gaining progress, and remains editable

#### Scenario: Buff does not inflate Spotter
- **WHEN** an achievement targets 10 grants of award `spotter` and Alice's Spotter is buffed five times
- **THEN** the spotter grant count remains 1

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
On first progression initialization, every fresh and upgraded database SHALL receive ordinary editable levels `recruit` (0), `regular` (100), `veteran` (500), `elite` (1500), and `legend` (5000), plus starter achievements First Contact (1 message), Intel Officer (5 `intel` awards), Spotter (10 `spotter` awards), Comedian (10 `joke` awards), Meme Lord (10 `meme` awards), Veteran (10 participating streams), Clutch (1 `clutch` award), and Contractor (1 contract win). Achievement `achievement_on_point` (Синхрон / In Sync, 10 `on_point` awards) SHALL be inserted by on-point catalog initialization when that id is absent, including on databases whose progression catalog already initialized. Starter achievements SHALL be enabled, non-secret, announced, and one-time; starter levels SHALL be announced. Global achievement and level alerts SHALL default disabled so upgrades cannot create an unsolicited on-stream behavior change. Display text SHALL use the persisted initialization locale. Stable ids and thresholds SHALL match across locales. Deleted or edited seeds MUST NOT be restored, translated, or reset later.

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
