## ADDED Requirements

### Requirement: Locale-aware lore expert starter award
The system SHALL initialize a deletable and editable `lore_expert` award once on fresh and upgraded databases. When that id is absent at initialization, it SHALL grant 50 points, use `chime`, and display for 5000 milliseconds with `fullscreen` layout. For `ru-RU`, its name and splash template SHALL be `Знаток лора` and `Знаток лора: {viewer}! +{points}`; for `en-GB`, they SHALL be `Lore Expert` and `Lore Expert: {viewer}! +{points}`. Existing rows with that id MUST remain unchanged. Once initialized, edits, deletion, and locale changes MUST NOT restore or translate the award. Interrupted initialization MUST resume in its originally persisted locale. Normal manual grant, history, and XP rules SHALL apply.

#### Scenario: Fresh localized catalog
- **WHEN** a fresh database is initialized in Russian or English
- **THEN** `lore_expert` is offered with the corresponding name and template, 50 points, chime sound, and five-second duration

#### Scenario: Existing installation upgrade
- **WHEN** an existing database first initializes the lore expert catalog without that award id
- **THEN** the localized award is added once and other award rows remain unchanged

#### Scenario: Existing custom award
- **WHEN** the database already contains `lore_expert` at initialization
- **THEN** all fields of that row remain unchanged

#### Scenario: Deleted award and changed locale
- **WHEN** the operator deletes the initialized award and restarts with another locale
- **THEN** it remains absent

#### Scenario: Edited award and changed locale
- **WHEN** the operator edits the initialized award and restarts with another locale
- **THEN** its fields remain as edited

#### Scenario: Interrupted initialization
- **WHEN** initialization resumes after interruption with another configured locale
- **THEN** the award uses the locale persisted when initialization started

#### Scenario: Manual lore expert grant
- **WHEN** the operator grants the unmodified award to a viewer
- **THEN** the viewer gains 50 XP and normal award history and alert delivery identify Lore Expert

### Requirement: Lore expert uses an open-book emblem
Built-in award presentation for `lore_expert` SHALL use a decorative open-book symbol in admin and OBS alerts, without letters or monograms. User-provided media SHALL retain its existing precedence.

#### Scenario: Built-in lore expert presentation
- **WHEN** a lore expert award is displayed without custom media
- **THEN** its emblem is a text-free open book, including after the award is renamed
