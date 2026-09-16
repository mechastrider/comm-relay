## Purpose

Add a dedicated global debug audience while preserving the production WebSocket contract.

## ADDED Requirements

### Requirement: Debug clients use a dedicated WebSocket route

`GET /ws` SHALL continue to create a production subscription under its existing contract. `GET /ws/overlay-debug` SHALL create a subscription to the one process-global debug audience, while preserving the hub's slow-client protection and reconnect behavior. The two routes MUST NOT exchange content frames, and debug routing MUST NOT be activated by a query parameter on `/ws`.

#### Scenario: Production client connects
- **WHEN** a client upgrades `/ws`
- **THEN** it receives production frames under the existing contract
- **AND** never receives debug scenario content

#### Scenario: Debug client connects
- **WHEN** a client upgrades `/ws/overlay-debug`
- **THEN** it receives current appearance settings and frames from the global debug channel
- **AND** does not receive production content

#### Scenario: Dedicated route is unavailable on an older build
- **WHEN** a test page or client requests `/ws/overlay-debug` from a build that predates this feature
- **THEN** the request returns 404 and cannot fall back to production `/ws`

### Requirement: Debug reset is a generic surface event

The feed SHALL expose a `debug_reset` event to connected debug clients so chat, leaderboard, and alert surfaces can clear transient test state without reloading. Production clients MUST never receive that event.

#### Scenario: Global reset
- **WHEN** Reset, Run, or Replay advances the global run generation
- **THEN** every connected debug surface is eligible to receive `debug_reset`
- **AND** production clients receive no reset frame
