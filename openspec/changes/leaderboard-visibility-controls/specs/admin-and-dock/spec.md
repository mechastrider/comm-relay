## Purpose

Let the operator configure automatic leaderboard behavior and control the current on-air state from the compact OBS dock.

## ADDED Requirements

### Requirement: Settings configure global leaderboard visibility
Settings SHALL expose policy, display duration, cooldown, dirty interval, award trigger, and meaningful rank-change trigger as one global leaderboard behavior section. The UI SHALL explain that the policy applies to every production leaderboard source and is independent from Studio appearance presets. Trigger controls that cannot affect the selected policy MAY be disabled but MUST retain their saved values. Saving SHALL use the existing config update and field-error behavior.

#### Scenario: Choose automatic behavior
- **WHEN** the operator selects Automatic, enables award and rank-change triggers, and saves
- **THEN** public config and runtime policy update without publishing a Studio appearance draft

#### Scenario: Choose on request
- **WHEN** the operator selects On request
- **THEN** the UI explains that dock actions and configured viewer commands may show the board while automatic triggers do not

### Requirement: Message dock provides compact leaderboard controls
`/dock/messages` SHALL retain the message log and add a small pinned operator toolbar above its scrollable message body. The toolbar SHALL show current policy/state and a live countdown for timed state, plus Show, Pin or Resume, and Hide controls. It SHALL also expose the existing active-preset selection using `POST /api/overlay/activate`. The toolbar MUST remain unthemed, keyboard usable, localized in English and Russian, and usable at narrow dock widths without covering the last message.

#### Scenario: Timed state in dock
- **WHEN** the board is visible for another 12 seconds
- **THEN** the dock status announces timed visibility and updates an accessible countdown without moving message scroll position

#### Scenario: Pin then resume
- **WHEN** the operator pins the board and later selects Resume automatic behavior
- **THEN** both actions report progress in context and the status follows authoritative responses or WebSocket frames

#### Scenario: Failed control
- **WHEN** a dock visibility request fails
- **THEN** controls leave the prior authoritative state visible and offer a localized retry-safe error

#### Scenario: Narrow dock
- **WHEN** the dock is 300 CSS pixels wide
- **THEN** controls wrap or compact without horizontal scrolling and icon-only variants have hover/focus tooltips and accessible names

### Requirement: Command editor supports leaderboard actions
The Audience command editor SHALL let the operator choose Alert or Show leaderboard. Alert SHALL retain all current splash, media, sound, and duration fields. Show leaderboard SHALL keep trigger, enabled, and per-viewer cooldown controls, hide irrelevant alert presentation fields, and explain that the command shows the board for its configured global display duration. No leaderboard command SHALL be created automatically.

#### Scenario: Create leaderboard command
- **WHEN** the operator creates enabled trigger `leaderboard` with action Show leaderboard and a 180-second cooldown
- **THEN** the saved catalog row is distinguishable from alert commands and `!leaderboard` can request the board

#### Scenario: Switch action without losing clarity
- **WHEN** the operator changes an alert command to Show leaderboard
- **THEN** irrelevant fields are no longer required and the visible form describes the new effect before save
