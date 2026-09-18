## ADDED Requirements

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

## MODIFIED Requirements

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
