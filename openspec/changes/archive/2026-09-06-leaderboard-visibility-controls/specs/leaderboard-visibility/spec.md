## Purpose

Coordinate when the production OBS leaderboard is visible without requiring the streamer to toggle an OBS source during the broadcast.

## ADDED Requirements

### Requirement: Leaderboard visibility follows one global policy
The system SHALL support global policies `always`, `automatic`, and `on_request`. `always` SHALL keep production leaderboard surfaces visible unless a runtime manual override is active. `automatic` SHALL begin hidden and allow configured award, meaningful rank-change, dirty-interval, command, and manual triggers. `on_request` SHALL begin hidden and allow only command and manual triggers. Preview and dedicated debug leaderboard pages MUST ignore production visibility state.

#### Scenario: Always policy
- **WHEN** the configured policy is `always` and no runtime override exists
- **THEN** every connected production leaderboard surface is visible

#### Scenario: Automatic startup
- **WHEN** the process starts with policy `automatic`
- **THEN** production leaderboard surfaces begin hidden until an eligible trigger occurs

#### Scenario: Test page isolation
- **WHEN** production visibility changes while `/overlay/test/leaderboard` is connected
- **THEN** the test page retains its isolated debug behavior

### Requirement: Runtime visibility is server-authoritative
The server SHALL maintain one runtime state of `hidden`, `timed`, or `pinned`, including an optional absolute `visible_until` timestamp and a reason. Timed expiry SHALL clear a manual Show override and re-apply the configured policy baseline: hidden for `automatic` and `on_request`, pinned for `always`. A new or reconnected production client MUST receive the current state before relying on later transitions. Runtime pinning MUST NOT persist across process restart.

#### Scenario: Timed expiry outside always policy
- **WHEN** a timed state reaches `visible_until` without extension under `automatic` or `on_request`
- **THEN** the server transitions to hidden and all connected production leaderboard clients hide

#### Scenario: Timed expiry under always policy
- **WHEN** a manual timed state reaches `visible_until` under `always`
- **THEN** the server returns to pinned visible state because the configured baseline is always visible

#### Scenario: Reconnect during display
- **WHEN** a leaderboard reconnects while a timed display still has five seconds remaining
- **THEN** it receives that same deadline and remains synchronized with existing clients

#### Scenario: Restart clears pin
- **WHEN** the process restarts while the runtime state was pinned
- **THEN** the configured policy determines startup state and the pin is not restored

### Requirement: Manual controls override automatic gating
Manual Show SHALL enter or extend timed state for the requested valid duration, defaulting to the configured duration. Pin SHALL enter pinned state. Hide SHALL enter hidden state and start the configured cooldown. Under `always`, Hide SHALL remain a manual hidden override until Resume clears it. Under `automatic` and `on_request`, Hide SHALL clear any Show or Pin override so it ends the current display without indefinitely blocking later eligible triggers; automatic triggers remain gated only until cooldown expires, while viewer-command requests retain their existing visibility-cooldown bypass. Resume SHALL clear the current manual override and immediately re-evaluate the configured policy. Manual Show and Pin SHALL bypass cooldown.

#### Scenario: Show during cooldown
- **WHEN** automatic triggers are cooling down and the operator requests Show
- **THEN** the leaderboard becomes timed immediately

#### Scenario: Hide a pinned board
- **WHEN** the board is pinned and the operator requests Hide
- **THEN** it becomes hidden, the pin is cleared, and automatic triggers wait for cooldown

#### Scenario: Hide in on-request mode
- **WHEN** the operator hides the board under `on_request` and a configured viewer command is used later
- **THEN** the command may start a new timed display without an additional Resume action

#### Scenario: Resume always policy
- **WHEN** the board is manually hidden under policy `always` and the operator requests Resume
- **THEN** it becomes visible without a timed deadline

### Requirement: Automatic triggers are meaningful and rate-limited
In `automatic`, an enabled award trigger SHALL request display after the triggering award's own `duration_ms`. An enabled rank-change trigger SHALL request display when an XP mutation changes the leader or ordered top-three membership. Other XP or rank changes SHALL mark the board dirty. After cooldown, an enabled dirty interval SHALL show the board when it has remained dirty for the configured interval. Message-count-only updates MUST NOT trigger or dirty automatic display. Eligible triggers during timed state SHALL extend the deadline from the newest trigger; triggers during pinned state SHALL not change state.

#### Scenario: Award display
- **WHEN** an award with a five-second alert duration succeeds in automatic mode and award triggering is enabled
- **THEN** the board requests its configured timed display after that five-second delay

#### Scenario: New leader
- **WHEN** an XP mutation changes the first-ranked viewer and rank-change triggering is enabled outside cooldown
- **THEN** the leaderboard enters timed state

#### Scenario: Message count only
- **WHEN** a chat line changes only `message_count`
- **THEN** no visibility trigger or dirty flag is produced

#### Scenario: Dirty fallback
- **WHEN** non-top-three XP changes leave the board dirty for 15 minutes and cooldown has elapsed
- **THEN** the enabled dirty interval enters timed state and clears dirty after display

### Requirement: Visibility timing is bounded and recoverable
Configured display duration SHALL be 5–60 seconds, cooldown 0–3600 seconds, and dirty interval either 0 (disabled) or 60–3600 seconds. Defaults for a new configuration SHALL be 15, 300, and 900 seconds. Timer processing MUST stop promptly on application shutdown and MUST NOT create an unbounded timer per incoming event.

#### Scenario: Invalid duration
- **WHEN** the operator saves a display duration of 2 seconds
- **THEN** validation rejects the update with a field error and running state is unchanged

#### Scenario: Shutdown with delayed award
- **WHEN** shutdown begins while an award trigger is delayed
- **THEN** the delay is canceled and shutdown does not wait for its deadline
