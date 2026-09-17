## ADDED Requirements

### Requirement: Command editor manages aliases
The Audience command editor SHALL let the operator view and edit aliases for the selected command. Aliases SHALL use a dedicated labeled field (not mixed into the canonical trigger input), accept slug tokens without a leading `!`, and show field errors adjacent to that control on uniqueness or slug failures. Save MUST send the complete `aliases` list with create/update. The catalog list MAY show aliases as secondary text under the canonical `!trigger`. Overlay, dock, and Live Messages MUST NOT gain an aliases editor.

#### Scenario: Save alias
- **WHEN** the operator adds `heate` on command `heat` and saves
- **THEN** the editor redisplays `heate` after reload and `!heate` can fire `heat`

#### Scenario: Conflict shown on aliases
- **WHEN** the operator saves an alias that collides with another command
- **THEN** an accessible field error appears on the aliases control and unsaved input is preserved

#### Scenario: Leaderboard command aliases
- **WHEN** the operator edits a `show_leaderboard` command
- **THEN** the aliases field remains available with trigger, enabled, and cooldown

## MODIFIED Requirements

### Requirement: Audience hosts two catalogs
Audience SHALL offer Commands and Awards lists separate from the viewers people workspace. Each catalog SHALL support create, edit, enable (commands), cooldown (commands), aliases (commands), points (awards), splash text, sound, custom image, custom sound file, volume, layout, image fit, image size, and delete. Catalog editors MUST NOT appear in the dock.

#### Scenario: Open commands
- **WHEN** the operator opens Audience Commands
- **THEN** seeded or operator-defined commands are listed and can be edited without leaving `/`

#### Scenario: Edit aliases
- **WHEN** the operator opens the command editor for `heat`
- **THEN** aliases can be added or cleared without leaving the editor

### Requirement: Command editor supports leaderboard actions
The Audience command editor SHALL let the operator choose Alert or Show leaderboard. Alert SHALL retain all current splash, media, sound, and duration fields. Show leaderboard SHALL keep trigger, aliases, enabled, and per-viewer cooldown controls, hide irrelevant alert presentation fields, and explain that the command shows the board for its configured global display duration. No leaderboard command SHALL be created automatically.

#### Scenario: Create leaderboard command
- **WHEN** the operator creates enabled trigger `leaderboard` with action Show leaderboard and a 180-second cooldown
- **THEN** the saved catalog row is distinguishable from alert commands and `!leaderboard` can request the board

#### Scenario: Switch action without losing clarity
- **WHEN** the operator changes an alert command to Show leaderboard
- **THEN** irrelevant fields are no longer required, aliases remain editable, and the visible form describes the new effect before save
