## ADDED Requirements

### Requirement: Command editor supports like and buff actions
The Audience command editor SHALL let the operator choose Alert, Show leaderboard, Like, or Buff. Like SHALL keep trigger, aliases, enabled, and cooldown, require an award-type selector (`award_id`), and hide splash presentation fields. Buff SHALL keep trigger, aliases, enabled, and cooldown, require a positive `points` field, and hide splash presentation fields. The catalog list MAY show the action as secondary text.

#### Scenario: Create like command in Audience
- **WHEN** the operator chooses Like, selects award `viewer_like`, and saves trigger `like`
- **THEN** the catalog row is distinguishable as Like and `!like` matches after save

#### Scenario: Create buff command in Audience
- **WHEN** the operator chooses Buff, sets points 5, and saves trigger `buff`
- **THEN** the catalog row is distinguishable as Buff and `!buff` matches after save

### Requirement: Settings expose buff caps
Settings SHALL offer integer controls for `buffs_per_award_per_viewer` (default 1) and `buff_max_unique_viewers` (default 5), saved through `POST /api/config/update`, with localized copy that these caps apply per operator award. Values MUST be integers ≥ 0. The dock MUST NOT edit these fields.

#### Scenario: Save caps
- **WHEN** the operator sets unique buffers to 8 and saves
- **THEN** `POST /api/config/update` persists `buff_max_unique_viewers` 8

### Requirement: Level editor exposes social quotas
The Audience level editor SHALL show `like_quota` and `buff_quota` beside existing level fields, validate 0–100, and save through the existing level update action. The list MAY show quotas as secondary text.

#### Scenario: Edit veteran quotas
- **WHEN** the operator sets veteran `buff_quota` to 6 and saves
- **THEN** later buffs from a veteran viewer use quota 6

### Requirement: Admin and dock show rejected command lines
Live Messages and `/dock/messages` SHALL mark a matched social command as frozen when `command_outcome` is `rejected` or `cooldown`. Rejected rows SHALL show the localized reason label and MUST NOT show a cooldown countdown unless status is `cooldown`. After a page reload, while the same process is running, admin and dock SHALL restore rejected outcomes from the process-local map the same way as cooldown.

#### Scenario: Ambiguous like in the dock
- **WHEN** a dock client receives `rejected` / `ambiguous` for `!like alicx`
- **THEN** that line shows frozen chrome and the clarify label
