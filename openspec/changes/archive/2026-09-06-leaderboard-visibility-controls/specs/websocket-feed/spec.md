## Purpose

Synchronize production leaderboard visibility independently from ranking snapshots.

## ADDED Requirements

### Requirement: Visibility uses a dedicated WebSocket envelope
The production `/ws` feed SHALL broadcast `leaderboard_visibility` frames containing `state` (`hidden`, `timed`, or `pinned`), `policy`, boolean `visible`, nullable RFC3339 `visible_until`, and `reason` (`startup`, `policy`, `manual`, `award`, `rank_change`, `interval`, or `command`). Ranking `leaderboard` frames MUST remain data-only and MUST NOT imply visibility. Clients that ignore the new type SHALL continue processing existing frames.

#### Scenario: Manual timed show
- **WHEN** the operator requests a timed show
- **THEN** clients receive `leaderboard_visibility` with state `timed`, visible true, an absolute deadline, and reason `manual`

#### Scenario: Timer expires
- **WHEN** the authoritative deadline expires
- **THEN** clients receive the configured policy baseline with a null deadline and the applicable policy reason: hidden for `automatic` or `on_request`, pinned and visible for `always`

#### Scenario: Unrelated client
- **WHEN** chat overlay or dock message rendering receives a visibility frame
- **THEN** its existing message behavior remains functional

### Requirement: New production clients receive a visibility snapshot
After a production `/ws` client connects, the server SHALL send the current visibility frame through the normal bounded client queue. Debug `/ws/overlay-debug` clients MUST NOT receive production visibility frames.

#### Scenario: Connect while pinned
- **WHEN** a production client connects while state is pinned
- **THEN** it receives pinned visible state without waiting for another control action

#### Scenario: Debug isolation
- **WHEN** a debug leaderboard client connects
- **THEN** it receives no production visibility snapshot
