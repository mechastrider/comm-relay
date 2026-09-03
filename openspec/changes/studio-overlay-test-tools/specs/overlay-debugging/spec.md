## Purpose

Define a safe Studio workflow for exercising real overlay event paths without a live stream or product-state mutation.

## ADDED Requirements

### Requirement: The global Studio test channel is isolated from live overlays

The application MUST provide one process-global, local-only, in-memory test channel shared by all clients connected through the dedicated `/ws/overlay-debug` endpoint. Dedicated test pages MUST use that endpoint exclusively. Production `/ws` and normal overlay routes MUST remain unchanged and MUST NOT receive debug frames; debug clients MUST NOT receive production message, alert, or leaderboard frames. Test URLs MUST contain no generated routing key and MUST remain stable across restarts.

#### Scenario: Test runs while live sources are connected
- **WHEN** an operator fires a scenario while test and on-air sources are connected
- **THEN** all connected dedicated test sources are eligible to receive the scenario frames
- **AND** ordinary on-air sources receive none of those frames

#### Scenario: Debug source needs current appearance
- **WHEN** a debug source connects
- **THEN** it receives the active overlay settings needed to render the selected appearance
- **AND** it remains isolated from production content frames

#### Scenario: Multiple operators use test mode
- **WHEN** multiple Studio tabs or OBS test sources are connected
- **THEN** they share the same scenario/reset channel
- **AND** the action result exposes the number of connected debug sockets that accepted its initial delivery

### Requirement: Test scenarios exercise production rendering contracts without mutations

The application SHALL provide typed `message`, `rewarded_message`, `command_alert`, `leaderboard_update`, and `alert_burst` scenarios. Scenario steps MUST use the same observable message, leaderboard, and alert envelopes consumed by production surface handlers, but MUST NOT grant points or write viewer, history, analytics, interaction, or configuration state. Safe overrides map `display_name` to the synthetic actor, `message` to synthetic source text, `label` to the applicable command or award label, and `points` to the applicable award or first leaderboard row; deterministic defaults fill all omitted values and the remaining two leaderboard rows.

#### Scenario: Rewarded message sequence
- **WHEN** the operator fires `rewarded_message`
- **THEN** the test channel receives an immediate message followed by its matching award at 700 ms
- **AND** the resulting award alert contains the original message text

#### Scenario: Alert burst
- **WHEN** the operator fires `alert_burst`
- **THEN** the test channel receives three alerts in command, award, command order at short deterministic intervals

#### Scenario: Immediate scenarios
- **WHEN** the operator fires `message`, `command_alert`, or `leaderboard_update`
- **THEN** the test channel receives respectively an immediate message, immediate command alert, or immediate deterministic three-row leaderboard snapshot

#### Scenario: Server restarts
- **WHEN** the application restarts
- **THEN** prior debug clients, active run state, and pending scenario steps are absent
- **AND** no product data needs recovery

### Requirement: Runs atomically reset and replace the global test state

Every Run or Replay MUST atomically cancel the prior global run, enqueue `debug_reset` to all connected debug sockets, and then enqueue the new scenario's immediate frames. `debug_reset` MUST clear chat, leaderboard, visible and pending alerts, transient timers, and dedupe state. Reset MUST perform only the cancellation and clear. Delayed work MUST recheck the run generation immediately before every send, so a replacement run or Reset cannot receive a stale delayed frame.

#### Scenario: Reset during a delayed sequence
- **WHEN** the operator resets after the first step
- **THEN** connected test surfaces clear their debug content
- **AND** remaining steps from that run are not delivered

#### Scenario: A newer run replaces an older run
- **WHEN** any Studio tab fires or replays a scenario while a prior delayed sequence is pending
- **THEN** all connected test surfaces receive a reset before the new immediate frames
- **AND** no delayed step from the older generation is delivered

#### Scenario: No test source is connected
- **WHEN** the operator fires a valid scenario with no connected debug receiver
- **THEN** the action succeeds without affecting live state
- **AND** Studio reports that zero clients received it and the server schedules no delayed step
