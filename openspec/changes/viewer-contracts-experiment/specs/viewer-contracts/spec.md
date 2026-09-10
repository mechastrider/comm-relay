## Purpose

Define the bounded operator-controlled lifecycle for one active viewer contract and its settlement through the existing reward system.

## ADDED Requirements

### Requirement: The operator can open one viewer contract
`POST /api/viewer-contracts/open` SHALL accept snake_case JSON fields `title`, `objective`, and `reward_id`. The server MUST trim text, require a title of 1–80 Unicode code points and an objective of 1–280 Unicode code points, require an existing reward, persist the contract before responding, and reject the request with HTTP 409 while another contract is active. Success SHALL return the active contract and enqueue its announcement.

#### Scenario: Open a contract
- **WHEN** the operator opens `Find Loot` with a valid objective and existing `spotter` reward while no contract is active
- **THEN** the API returns the new active contract and one announcement is broadcast

#### Scenario: Another contract is active
- **WHEN** the operator tries to open a second contract
- **THEN** the API returns HTTP 409 and neither contract is changed or announced

#### Scenario: Invalid input
- **WHEN** the title or objective is empty or too long, or `reward_id` is unknown
- **THEN** the API returns HTTP 400 with a UI-safe error and no contract is created

### Requirement: The active contract is durable and readable
`GET /api/viewer-contracts/current` SHALL return `contract` as null when no contract is active or an object containing `id`, `title`, `objective`, `reward_id`, `reward_name`, positive `reward_points`, and RFC3339 `announced_at`. The response SHALL also contain authoritative `content` and `visible` presentation fields. At most one contract MUST be active, including after a process restart.

#### Scenario: Restart with an active contract
- **WHEN** CommRelay restarts after a contract was opened but not settled
- **THEN** the same contract is returned as active without broadcasting a duplicate announcement

#### Scenario: No active contract
- **WHEN** the prior contract was settled and the current endpoint is read
- **THEN** the response contains `contract` set to null

### Requirement: Promised reward terms are stable
Opening a contract SHALL snapshot the selected reward's id, display name, points, splash template, sound, duration, layout, and optional custom-media presentation fields. Reads, repeated announcements, and winner settlement MUST use that snapshot even if the catalog item is later renamed, edited, or deleted.

#### Scenario: Reward edited during a contract
- **WHEN** an active contract promised 25 XP and the selected catalog reward is later changed to 40 XP
- **THEN** the active contract still displays and grants 25 XP

#### Scenario: Reward deleted during a contract
- **WHEN** the selected catalog reward is deleted after announcement
- **THEN** the active contract can still be announced again and awarded with its snapshotted terms

### Requirement: The operator can repeat the active announcement
`POST /api/viewer-contracts/announce` SHALL accept `id`, verify that it identifies the active contract, and broadcast one new contract announcement without changing `announced_at` or reward terms. An unknown, stale, or already settled id MUST return HTTP 409 and MUST NOT broadcast an alert.

#### Scenario: Repeat after OBS reload
- **WHEN** the operator repeats the currently active contract announcement
- **THEN** one fresh announcement is queued and the active contract remains unchanged

#### Scenario: Repeat a stale contract
- **WHEN** the operator submits the id of a settled contract
- **THEN** the request returns HTTP 409 and no announcement is broadcast

### Requirement: The operator can override active contract presentation
`POST /api/viewer-contracts/display` SHALL accept the active contract `id`, `content` (`contract` or `leaderboard`), and `visible`. A successful request SHALL update only process-local presentation state and broadcast its authoritative snapshot; it MUST NOT mutate the durable contract or ordinary leaderboard visibility policy. Stale ids and requests without an active contract MUST return HTTP 409. Opening or recovering an active contract after process restart SHALL default to `content=contract` and `visible=true`.

#### Scenario: Hide the active contract surface
- **WHEN** the operator submits the active id with `visible=false`
- **THEN** the shared leaderboard Browser Source hides while the contract remains active

#### Scenario: Restore ranking temporarily
- **WHEN** the operator submits the active id with `content=leaderboard` and `visible=true`
- **THEN** the shared Browser Source shows ranking without changing the configured leaderboard policy

#### Scenario: Restart with an active contract
- **WHEN** CommRelay restarts while a durable contract remains active
- **THEN** presentation resets to the visible contract objective and connected clients receive that snapshot

### Requirement: Winner settlement is atomic and idempotent
`POST /api/viewer-contracts/award` SHALL accept active contract `id` and canonical `viewer_id`. It MUST resolve a visible canonical viewer, atomically mark the contract awarded, grant exactly the snapshotted reward points to session, day, and all-time XP, and append one award interaction event. Only after commit SHALL it broadcast the normal award alert and refreshed leaderboards. Retrying the same or another settlement for a non-active id MUST return HTTP 409 without another grant, event, or alert.

#### Scenario: Award a known viewer
- **WHEN** the operator awards the active contract to a canonical Twitch, YouTube, VK, or merged viewer
- **THEN** the contract closes, the viewer receives the promised XP once, one award event is stored, and normal award and leaderboard frames are broadcast

#### Scenario: Duplicate settlement
- **WHEN** two award requests race for the same active contract
- **THEN** exactly one succeeds and the other receives HTTP 409 without duplicate XP

#### Scenario: Missing or hidden viewer
- **WHEN** `viewer_id` is unknown or identifies a hidden merge source
- **THEN** the API returns HTTP 404 and the contract remains active

#### Scenario: Persistence fails
- **WHEN** the contract transition, XP update, or award event cannot be committed
- **THEN** the request fails, the contract remains active, and no award or leaderboard frame is broadcast

### Requirement: The operator can close without a result
`POST /api/viewer-contracts/close` SHALL accept active contract `id`, atomically mark it closed without a winner, and grant no XP. A stale or already settled id MUST return HTTP 409. Closing MUST NOT emit an award alert or create a reward-history entry.

#### Scenario: No viewer completes the task
- **WHEN** the operator confirms close without result for the active contract
- **THEN** no contract remains active and no viewer XP, award event, or alert is created

#### Scenario: Stale close request
- **WHEN** a close request races after a winner settlement
- **THEN** it receives HTTP 409 and cannot change the awarded result

#### Scenario: Ordinary leaderboard resumes after settlement
- **WHEN** award or close commits for the active contract
- **THEN** the contract presentation becomes inactive and the pre-existing leaderboard visibility policy resumes without being rewritten

### Requirement: Lifecycle operations are observable without exposing content
Successful open, repeat announcement, award, and no-result close operations SHALL be logged with action and contract id; winner settlement SHALL also include viewer id and reward id. Rejected stale transitions and persistence failures MUST be observable at an appropriate log level. Logs MUST NOT include the contract objective, chat bodies, OAuth tokens, or filesystem secrets.

#### Scenario: Successful winner settlement
- **WHEN** a contract is awarded
- **THEN** the session log identifies the contract, action, viewer, and reward without recording operator-authored objective text

#### Scenario: Conflicting action
- **WHEN** an action is rejected because the contract is no longer active
- **THEN** diagnostics remain sufficient to identify the stale lifecycle action without logging private content
