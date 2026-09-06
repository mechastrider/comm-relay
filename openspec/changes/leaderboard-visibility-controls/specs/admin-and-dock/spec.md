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
`/dock/messages` SHALL retain the message log and add a small pinned operator toolbar above its scrollable message body. The toolbar SHALL show current policy/state and a live countdown for timed state. Under `always`, it SHALL expose one labelled visibility switch whose on state clears the manual hidden override and whose off state hides the board. Under `automatic` and `on_request`, it SHALL expose Show for the configured duration, a pressed-state Pin toggle, and Hide; Show SHALL be disabled while pinned, turning Pin off SHALL Resume policy behavior, and Hide SHALL remain available while pinned. No standalone Auto or Resume control SHALL be shown. The toolbar SHALL also expose the existing active-preset selection using `POST /api/overlay/activate`. It MUST remain unthemed, keyboard usable, localized in English and Russian, and usable at narrow dock widths without covering the last message.

#### Scenario: Timed state in dock
- **WHEN** the board is visible for another 12 seconds
- **THEN** the dock status announces timed visibility and updates an accessible countdown without moving message scroll position

#### Scenario: Toggle pin
- **WHEN** the operator pins the board and later turns the Pin toggle off
- **THEN** the dock sends Pin then Resume, reports progress in context, and follows authoritative responses or WebSocket frames

#### Scenario: Always policy switch
- **WHEN** policy is `always` and the operator turns off the labelled visibility switch
- **THEN** the board remains hidden until the operator turns the same switch on or the process restarts

#### Scenario: Hide stays available while pinned
- **WHEN** the board is pinned under `automatic` or `on_request`
- **THEN** Show is disabled, Pin is announced as pressed, and Hide remains available as the direct hide action

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
