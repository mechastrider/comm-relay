## Purpose

Synchronize dedicated recap Browser Sources with server-authoritative runtime visibility.

## ADDED Requirements

### Requirement: Recap state uses a stable WebSocket envelope
The production `/ws` feed SHALL use `type` `stream_recap_state` with boolean `visible` and `snapshot` containing the bounded recap snapshot when visible or null when hidden. A successful Show, Hide, or New stream action SHALL publish the resulting state only after authoritative storage and session operations succeed. Clients that do not recognize the type MUST continue processing known frames.

#### Scenario: Show committed recap
- **WHEN** a recap snapshot commits and becomes visible
- **THEN** clients receive one visible `stream_recap_state` containing that exact snapshot

#### Scenario: Hide recap
- **WHEN** the operator hides recap
- **THEN** clients receive `visible` false with `snapshot` null

#### Scenario: Unrelated client
- **WHEN** chat, leaderboard, alert, admin, or dock receives a recap frame
- **THEN** its existing behavior remains functional

### Requirement: New production clients receive current recap state
Every newly connected production `/ws` client SHALL receive the current recap state through its bounded client queue. A reconnect while visible SHALL receive the same stored snapshot; startup after a process restart SHALL report hidden. Debug `/ws/overlay-debug` clients MUST NOT receive production recap frames.

#### Scenario: Recap overlay reconnects
- **WHEN** the recap Browser Source reconnects while a recap remains visible
- **THEN** it receives visible state with the unchanged snapshot without another operator action

#### Scenario: Debug isolation
- **WHEN** a dedicated overlay-debug client connects
- **THEN** it receives no production recap state

### Requirement: Slow recap clients do not block control actions
Recap broadcasts SHALL use the existing bounded per-client delivery policy. A full client queue MUST NOT roll back a committed snapshot, block other clients, or make Show/Hide fail. Dropped recap state frames MUST be observable through existing WebSocket-drop diagnostics, and reconnect recovery SHALL converge the client.

#### Scenario: Stalled client during Show
- **WHEN** one client queue is full as recap becomes visible
- **THEN** storage and responsive clients succeed while the stalled client can recover the visible state after reconnecting
