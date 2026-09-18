## ADDED Requirements

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

## MODIFIED Requirements

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
