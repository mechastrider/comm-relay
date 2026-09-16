## Purpose

Extend the local action API with bounded, typed overlay-debug commands.

## ADDED Requirements

### Requirement: Overlay debug actions use typed POST-action routes

The server SHALL expose `POST /api/overlay-debug/scenario/fire` and `POST /api/overlay-debug/session/reset` as local action routes. Fire JSON MUST use snake_case, require one of `message`, `rewarded_message`, `command_alert`, `leaderboard_update`, or `alert_burst` as `scenario`, and MAY include applicable `display_name`, `message`, `label`, and `points` overrides. `display_name` MUST be at most 64 characters, `message` at most 500, `label` at most 80, and `points` an integer from 1 through 1000. Neither action accepts a routing key. Unknown scenarios or invalid optional fields MUST return the standard UI-safe error envelope and broadcast no frame. Alert display durations and scenario timing are server-controlled implementation constants.

#### Scenario: Fire a valid scenario
- **WHEN** a client posts a supported `scenario` and valid optional fields
- **THEN** the server returns HTTP 200 with `{"status":"started","run_id":"…","delivered_clients":N}` after the initial reset and immediate frames are enqueued and any delayed steps are scheduled
- **AND** `delivered_clients` is the number of unique currently connected debug sockets whose send queues accepted the initial reset/immediate delivery

#### Scenario: Reject arbitrary input
- **WHEN** a client posts an unknown scenario or an over-limit sample string
- **THEN** the server returns a UI-safe validation error
- **AND** broadcasts no frame

#### Scenario: Reset the global test channel
- **WHEN** a client posts to the reset action
- **THEN** the server globally cancels pending test steps, enqueues `debug_reset`, and returns HTTP 200 `{"status":"reset","delivered_clients":N}`
- **AND** `delivered_clients` counts unique connected debug sockets whose send queues accepted the reset

#### Scenario: Fire with no connected debug socket
- **WHEN** a client posts a valid scenario while no debug socket is connected
- **THEN** the server returns HTTP 200 with status `started`, a run ID, and `delivered_clients` equal to zero
- **AND** schedules no delayed scenario step
