## Purpose

Broadcast which recap window is visible so overlay and admin converge without capturing all-time.

## ADDED Requirements

### Requirement: Recap state names the visible window
Visible `stream_recap_state` frames SHALL include `window` `session` or `all`. Hidden frames SHALL set `visible` false, `window` null, `snapshot` null, and `all_time` null. When `window` is `session`, `snapshot` SHALL be the stored session recap and `all_time` SHALL be null. When `window` is `all`, `all_time` SHALL be the bounded all-time presentation and `snapshot` SHALL be null. Clients that ignore `window` and `all_time` MUST continue processing known frames. Debug `/ws/overlay-debug` clients MUST NOT receive production recap frames.

#### Scenario: Show all-time
- **WHEN** all-time becomes visible
- **THEN** production clients receive `visible` true, `window` `all`, `all_time` present, and `snapshot` null

#### Scenario: Switch back to session
- **WHEN** the operator shows the stored session recap after all-time
- **THEN** production clients receive `visible` true, `window` `session`, and that exact snapshot
- **AND** `all_time` is null

## MODIFIED Requirements

### Requirement: Recap state uses a stable WebSocket envelope
The production `/ws` feed SHALL use `type` `stream_recap_state` with boolean `visible`, nullable `window`, nullable session `snapshot`, and nullable `all_time`. When a session recap is visible, `snapshot` SHALL contain the bounded recap snapshot. When hidden, `snapshot` and `all_time` SHALL be null. A successful session Show, all-time Show, Hide, or New stream action SHALL publish the resulting state only after authoritative storage and session operations succeed. Clients that do not recognize the type MUST continue processing known frames.

#### Scenario: Show committed recap
- **WHEN** a recap snapshot commits and becomes visible
- **THEN** clients receive one visible `stream_recap_state` with `window` `session` containing that exact snapshot

#### Scenario: Hide recap
- **WHEN** the operator hides recap
- **THEN** clients receive `visible` false with `window` null, `snapshot` null, and `all_time` null

#### Scenario: Unrelated client
- **WHEN** chat, leaderboard, alert, admin, or dock receives a recap frame
- **THEN** its existing behavior remains functional

### Requirement: New production clients receive current recap state
Every newly connected production `/ws` client SHALL receive the current recap state through its bounded client queue. A reconnect while the session window is visible SHALL receive the same stored snapshot. A reconnect while the all-time window is visible SHALL receive the same last-presented `all_time` payload. Startup after a process restart SHALL report hidden. Debug `/ws/overlay-debug` clients MUST NOT receive production recap frames.

#### Scenario: Recap overlay reconnects
- **WHEN** the recap Browser Source reconnects while a recap remains visible
- **THEN** it receives visible state with the unchanged snapshot without another operator action

#### Scenario: Debug isolation
- **WHEN** a dedicated overlay-debug client connects
- **THEN** it receives no production recap state

#### Scenario: Recap overlay reconnects on all-time
- **WHEN** the recap Browser Source reconnects while all-time remains visible
- **THEN** it receives visible state with `window` `all` and the unchanged last all-time presentation
